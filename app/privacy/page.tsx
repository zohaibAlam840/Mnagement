import Link from "next/link"

export const metadata = {
  title: "Privacy Policy – ABA Fieldwork Pro",
  description: "Privacy policy for ABA Fieldwork Pro",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-zinc-100 sticky top-0 bg-white/90 backdrop-blur z-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="font-semibold text-zinc-900">ABA Fieldwork Pro</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-400 mb-10">Last updated: May 28, 2026</p>

        <div className="space-y-8 text-zinc-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">1. Overview</h2>
            <p>
              ABA Fieldwork Pro (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the app&rdquo;) is a fieldwork tracking tool for ABA (Applied Behavior Analysis) trainees and supervisors. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account information:</strong> Email address and password (via Supabase Auth) when you create an account.</li>
              <li><strong>Profile information:</strong> Your name and role (trainee or supervisor) collected during onboarding.</li>
              <li><strong>Fieldwork data:</strong> Activities, session logs, and weekly reports you create within the app.</li>
              <li><strong>Google Calendar data:</strong> If you choose to connect Google Calendar, we request read-only access to your calendar events solely to help you import them as fieldwork activities. We do not store your calendar events — only the data you explicitly choose to import.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">3. Google Calendar Integration</h2>
            <p className="mb-2">
              ABA Fieldwork Pro uses the Google Calendar API with the <code className="bg-zinc-100 px-1 py-0.5 rounded text-xs">calendar.events.readonly</code> scope. This allows the app to:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-2">
              <li>Read your calendar events for the current week</li>
              <li>Display them inside the app so you can choose which ones to import as fieldwork activities</li>
            </ul>
            <p className="mb-2">We do <strong>not</strong>:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Store your raw calendar events in our database</li>
              <li>Share your calendar data with any third party</li>
              <li>Write to or modify your Google Calendar</li>
              <li>Access calendars other than your primary calendar</li>
            </ul>
            <p className="mt-2">
              Your Google OAuth tokens (refresh token and access token) are stored securely in our database and used only to fetch events on your behalf when you initiate an import. You can disconnect Google Calendar at any time from Settings → Calendar Sync, which immediately removes all stored tokens.
            </p>
            <p className="mt-2">
              ABA Fieldwork Pro&apos;s use and transfer of information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">4. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and operate the ABA Fieldwork Pro service</li>
              <li>To enable supervisors to review and approve trainee fieldwork hours</li>
              <li>To generate BACB-compliant activity reports</li>
              <li>To facilitate Google Calendar import when you choose to use that feature</li>
            </ul>
            <p className="mt-2">We do not sell your data, use it for advertising, or share it with third parties outside of what is necessary to operate the service (e.g., our hosting provider Vercel and database provider Supabase).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">5. Data Storage and Security</h2>
            <p>
              Your data is stored in Supabase (PostgreSQL) with row-level security policies that ensure each user can only access their own data. Data is transmitted over HTTPS at all times. We follow industry-standard practices to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">6. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Access:</strong> You can view all data you have entered in the app at any time.</li>
              <li><strong>Deletion:</strong> You can request deletion of your account and all associated data by emailing us.</li>
              <li><strong>Disconnect Google:</strong> You can revoke Google Calendar access at any time from Settings → Calendar Sync.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">7. Children&apos;s Privacy</h2>
            <p>
              ABA Fieldwork Pro is intended for adult professionals and trainees. We do not knowingly collect data from anyone under the age of 18.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of significant changes by updating the &ldquo;Last updated&rdquo; date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">9. Contact</h2>
            <p>
              If you have any questions about this Privacy Policy or your data, please contact us at:{" "}
              <a href="mailto:support@abafieldworkpro.com" className="text-violet-600 underline">
                support@abafieldworkpro.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-zinc-100 py-6 text-center text-xs text-zinc-400 mt-10">
        &copy; {new Date().getFullYear()} ABA Fieldwork Pro. All rights reserved.
      </footer>
    </div>
  )
}
