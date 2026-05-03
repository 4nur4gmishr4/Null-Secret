import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService: React.FC = () => {
  return (
    <div className="fade-in max-w-4xl mx-auto py-12 px-4 md:px-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: 'var(--text-primary)' }}>
          Terms of Service
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Last updated: May 2026
        </p>
      </div>

      {/* Content */}
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            By accessing or using Null-Secret, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>2. Description of Service</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            Null-Secret is a zero-knowledge, end-to-end encrypted secret-sharing service that allows users to send private messages that self-destruct after being read. The service is provided "as is" without warranty of any kind.
          </p>
          <ul className="list-disc list-inside text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <li>Create one-time or multi-view encrypted secret links</li>
            <li>Set expiration times and view limits for secrets</li>
            <li>Optional account features including history tracking and security settings</li>
            <li>End-to-end encryption using AES-256-GCM</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>3. User Responsibilities</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            You agree to use Null-Secret only for lawful purposes and in accordance with these Terms. You are responsible for:
          </p>
          <ul className="list-disc list-inside text-sm space-y-2 mt-4" style={{ color: 'var(--text-secondary)' }}>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Ensuring any content you share does not violate applicable laws</li>
            <li>Not attempting to reverse-engineer or exploit the service</li>
            <li>Not using the service to distribute malware, spam, or harmful content</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>4. Privacy and Data Protection</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            Null-Secret is designed with privacy as a core principle:
          </p>
          <ul className="list-disc list-inside text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <li>Messages are encrypted on your device before transmission</li>
            <li>We do not store plaintext messages or decryption keys</li>
            <li>We do not collect IP addresses or track user behavior</li>
            <li>Secrets are automatically deleted after expiration or view limit</li>
          </ul>
          <p className="text-sm leading-relaxed mt-4" style={{ color: 'var(--text-secondary)' }}>
            For detailed information, please review our <Link to="/privacy" className="underline" style={{ color: 'var(--text-secondary)' }}>Privacy Policy</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>5. Account and Security</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            Optional account features are provided through Firebase Authentication. When you create an account:
          </p>
          <ul className="list-disc list-inside text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <li>You are responsible for maintaining your account security</li>
            <li>You may delete your account at any time through the account settings</li>
            <li>Account deletion removes your data from our systems</li>
            <li>Daily usage limits apply to prevent abuse</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>6. Service Availability</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            We strive to maintain high availability but do not guarantee uninterrupted service. The service may be temporarily unavailable for maintenance, updates, or other reasons. We are not liable for any losses resulting from service unavailability.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>7. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Null-Secret is provided on an "as is" and "as available" basis. We disclaim all warranties, express or implied. In no event shall we be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>8. Prohibited Uses</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            You may not use Null-Secret to:
          </p>
          <ul className="list-disc list-inside text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <li>Share illegal content or facilitate illegal activities</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Harass, threaten, or harm others</li>
            <li>Distribute malware or malicious code</li>
            <li>Attempt to compromise the security of the service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>9. Modifications to Terms</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            We reserve the right to modify these Terms at any time. Continued use of the service after modifications constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>10. Governing Law</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            These Terms shall be governed by and construed in accordance with applicable laws. Any disputes shall be resolved in the appropriate courts.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>11. Contact Information</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            For questions about these Terms, please contact us at: <a href="mailto:anuragmishrasnag06082004@gmail.com" className="underline" style={{ color: 'var(--text-secondary)' }}>anuragmishrasnag06082004@gmail.com</a>
          </p>
        </section>
      </div>

      {/* Footer link */}
      <div className="mt-12 pt-8 text-center border-t" style={{ borderColor: 'var(--border-default)' }}>
        <Link to="/" className="text-xs font-bold uppercase tracking-widest underline" style={{ color: 'var(--text-tertiary)' }}>
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default TermsOfService;
