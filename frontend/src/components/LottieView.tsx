import React from 'react';
import LottieReact from 'lottie-react';

/**
 * lottie-react ships with a default export that resolves as either the
 * component directly or a module-namespace { default: Component }
 * depending on bundler interop. Unwrap once, here, so every caller can use
 * a regular React element without re-implementing the workaround.
 */
type LottieProps = React.ComponentProps<typeof LottieReact>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ResolvedLottie: React.ComponentType<LottieProps> = (LottieReact as any).default ?? LottieReact;

const LottieView: React.FC<LottieProps> = (props) => <ResolvedLottie {...props} />;

export default LottieView;
