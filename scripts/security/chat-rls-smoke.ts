import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type UserFixture = {
  id: string;
  email: string;
  password: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function randomToken(length = 8): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

function assertCondition(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function createAuthedClient(
  url: string,
  anonKey: string,
  fixture: UserFixture
): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: fixture.email,
    password: fixture.password,
  });

  if (error || !data.session) {
    throw new Error(`Failed to sign in test user ${fixture.email}: ${error?.message || 'no session'}`);
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    },
  });
}

async function createFixtureUser(service: SupabaseClient, prefix: string): Promise<UserFixture> {
  const suffix = `${Date.now()}-${randomToken(6)}`;
  const email = `${prefix}.${suffix}@example.com`;
  const password = `P@ss-${randomToken(12)}`;
  const fullName = `${prefix} ${suffix}`;

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create auth user ${email}: ${authError?.message || 'unknown error'}`);
  }

  const { error: profileError } = await service
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      trust_level: 1,
    });

  if (profileError) {
    await service.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to create profile row for ${email}: ${profileError.message}`);
  }

  return { id: authData.user.id, email, password };
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const service = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const createdUsers: string[] = [];
  let conversationId: string | null = null;
  let ownerCreatedConversationId: string | null = null;

  try {
    const owner = await createFixtureUser(service, 'rls-owner');
    const stranger = await createFixtureUser(service, 'rls-stranger');

    createdUsers.push(owner.id, stranger.id);

    const ownerClient = await createAuthedClient(supabaseUrl, supabaseAnonKey, owner);
    const strangerClient = await createAuthedClient(supabaseUrl, supabaseAnonKey, stranger);

    const { data: conversation, error: conversationError } = await service
      .from('conversations')
      .insert({ creator_id: owner.id })
      .select('id')
      .single();

    if (conversationError || !conversation?.id) {
      throw new Error(`Failed to create test conversation: ${conversationError?.message || 'unknown error'}`);
    }

    conversationId = conversation.id;

    const { error: participantsError } = await service
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: owner.id,
        name: owner.email,
      });

    if (participantsError) {
      throw new Error(`Failed to seed conversation participant: ${participantsError.message}`);
    }

    const ownerConversationResult = await ownerClient
      .from('conversations')
      .select('id')
      .eq('id', conversationId);

    assertCondition(!ownerConversationResult.error, `Owner conversation query failed: ${ownerConversationResult.error?.message}`);
    assertCondition((ownerConversationResult.data || []).length === 1, 'Owner should be able to view their conversation');

    const strangerConversationResult = await strangerClient
      .from('conversations')
      .select('id')
      .eq('id', conversationId);

    assertCondition(!strangerConversationResult.error, `Stranger conversation query failed: ${strangerConversationResult.error?.message}`);
    assertCondition((strangerConversationResult.data || []).length === 0, 'Stranger should not be able to view another user conversation');

    const strangerParticipantResult = await strangerClient
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId);

    assertCondition(!strangerParticipantResult.error, `Stranger participant query failed: ${strangerParticipantResult.error?.message}`);
    assertCondition((strangerParticipantResult.data || []).length === 0, 'Stranger should not view conversation participants for a conversation they are not in');

    const strangerInsertResult = await strangerClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: stranger.id,
        text: 'unauthorized probe',
      })
      .select('id')
      .single();

    assertCondition(!!strangerInsertResult.error, 'Stranger message insert should be denied by RLS');

    const ownerInsertResult = await ownerClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: owner.id,
        text: 'authorized message',
      })
      .select('id')
      .single();

    assertCondition(!ownerInsertResult.error, `Owner message insert should succeed: ${ownerInsertResult.error?.message}`);
    assertCondition(!!ownerInsertResult.data?.id, 'Owner message insert should return created message id');

    const strangerMessageRead = await strangerClient
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId);

    assertCondition(!strangerMessageRead.error, `Stranger message read query failed: ${strangerMessageRead.error?.message}`);
    assertCondition((strangerMessageRead.data || []).length === 0, 'Stranger should not read messages in foreign conversation');

    // SEC-04 (migration 036): a stranger must not be able to add *themselves* as a
    // participant. Before 036 this single insert defeated every check above.
    const strangerSelfJoin = await strangerClient
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: stranger.id,
        name: stranger.email,
      });

    assertCondition(!!strangerSelfJoin.error, 'Stranger self-join into conversation_participants should be denied by RLS');

    const strangerMembership = await service
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', stranger.id);

    assertCondition((strangerMembership.data || []).length === 0, 'Stranger must not be a participant after the denied self-join');

    const strangerMessageReadAfterJoinAttempt = await strangerClient
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId);

    assertCondition((strangerMessageReadAfterJoinAttempt.data || []).length === 0, 'Stranger must still not read messages after the denied self-join');

    // The legitimate client flow still works: the creator inserts the
    // conversation, adds themselves, then adds the peer.
    const { data: ownerConv, error: ownerConvError } = await ownerClient
      .from('conversations')
      .insert({ creator_id: owner.id })
      .select('id')
      .single();

    assertCondition(!ownerConvError && !!ownerConv?.id, `Owner should be able to create a conversation: ${ownerConvError?.message}`);
    ownerCreatedConversationId = ownerConv!.id;

    const ownerAddsSelf = await ownerClient
      .from('conversation_participants')
      .insert({ conversation_id: ownerCreatedConversationId, user_id: owner.id, name: owner.email });

    assertCondition(!ownerAddsSelf.error, `Creator should be able to add themselves: ${ownerAddsSelf.error?.message}`);

    const ownerAddsPeer = await ownerClient
      .from('conversation_participants')
      .insert({ conversation_id: ownerCreatedConversationId, user_id: stranger.id, name: stranger.email });

    assertCondition(!ownerAddsPeer.error, `Creator should be able to add a peer: ${ownerAddsPeer.error?.message}`);

    console.log('PASS: chat RLS smoke test verified cross-user isolation.');
  } finally {
    for (const id of [conversationId, ownerCreatedConversationId]) {
      if (id) {
        await service.from('conversations').delete().eq('id', id);
      }
    }

    for (const userId of createdUsers) {
      await service.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: chat RLS smoke test failed: ${message}`);
  process.exit(1);
});
