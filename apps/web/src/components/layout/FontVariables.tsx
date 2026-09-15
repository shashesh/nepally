import Head from 'next/head';
import { bodyFont, displayFont } from '../../styles/fonts';

/**
 * Points --font-display / --font-body at the next/font families. `html:root`
 * outranks the `:root` rule in tokens.css, whose readable family names remain
 * as the fallback for tests and the first paint.
 */
export default function FontVariables() {
  const css = `html:root{--font-display:${displayFont.style.fontFamily};--font-body:${bodyFont.style.fontFamily};}`;
  return (
    <Head>
      <style key="font-variables" dangerouslySetInnerHTML={{ __html: css }} />
    </Head>
  );
}
