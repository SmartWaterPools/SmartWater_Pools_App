import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-12 mx-auto px-4">
        <div className="space-y-8">
          <div className="text-center mb-10">
            <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
            <p className="text-lg text-muted-foreground">SmartWater Pools Management System</p>
            <p className="text-sm text-muted-foreground mt-2">Effective Date: February 23, 2026</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
            <p>
              These Terms of Service ("Terms") govern your access to and use of the SmartWater Pools Management 
              System ("Service"), operated by Smart Water Pools, LLC ("SmartWater Pools," "we," "our," or "us"). 
              By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these 
              Terms, you may not access or use the Service.
            </p>
            <p>
              These Terms apply to all users of the Service, including users who are contributors of content, 
              information, and other materials or services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Description of Service</h2>
            <p>
              SmartWater Pools provides a cloud-based pool service management platform that enables pool service 
              companies to manage their business operations, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Client and property management</li>
              <li>Service scheduling, route planning, and technician dispatch</li>
              <li>Work order and maintenance order management</li>
              <li>Pool equipment and chemical inventory tracking</li>
              <li>Invoice and estimate generation and payment processing</li>
              <li>Email and SMS communication with clients and team members</li>
              <li>Business reporting and analytics</li>
              <li>Integration with third-party services such as Google Calendar, Gmail, and Stripe</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Account Registration and Security</h2>
            <p>
              To use the Service, you must create an account by providing accurate, complete, and current information. 
              You are responsible for maintaining the confidentiality of your account credentials and for all activities 
              that occur under your account.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must be at least 18 years of age to create an account.</li>
              <li>You agree to provide truthful and accurate information during registration.</li>
              <li>You are responsible for safeguarding your password and must not share your account credentials with others.</li>
              <li>You must notify us immediately of any unauthorized use of your account or any other breach of security.</li>
              <li>We are not liable for any loss or damage arising from your failure to comply with these security requirements.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Organizations and Multi-User Access</h2>
            <p>
              The Service supports multi-user organizations. Organization administrators are responsible for managing 
              user access, roles, and permissions within their organization. By inviting users to your organization, 
              you grant them access to organizational data in accordance with the permissions you assign.
            </p>
            <p>
              Organization administrators are responsible for ensuring that all users within their organization comply 
              with these Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Acceptable Use</h2>
            <p>You agree to use the Service only for lawful purposes. You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable federal, state, local, or international law or regulation.</li>
              <li>Upload or transmit viruses, malware, or any other malicious code.</li>
              <li>Attempt to gain unauthorized access to other users' accounts, the Service's systems, or related networks.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Use the Service to transmit unsolicited communications (spam).</li>
              <li>Impersonate any person or entity, or falsely state or misrepresent your affiliation with a person or entity.</li>
              <li>Use the Service for any purpose other than its intended business use for pool service management.</li>
              <li>Reverse engineer, decompile, or disassemble any aspect of the Service.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Your Data and Content</h2>
            <p>
              You retain all rights to the data and content you submit to the Service ("Your Content"). By submitting 
              content to the Service, you grant us a limited, non-exclusive license to use, store, and process Your 
              Content solely for the purpose of providing and improving the Service.
            </p>
            <p>
              You are solely responsible for the accuracy, quality, and legality of Your Content and the means by 
              which you acquired it. You represent and warrant that you have all necessary rights to submit Your 
              Content to the Service.
            </p>
          </section>

          <section className="space-y-4 bg-muted/50 p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold">7. Third-Party Integrations</h2>
            <p>
              The Service integrates with third-party services to enhance functionality. By connecting third-party 
              accounts, you agree to the following:
            </p>

            <h3 className="text-xl font-medium mt-4">7.1 Google Services</h3>
            <p>
              The Service integrates with Google Gmail and Google Calendar. Use of Google data is governed by our{" "}
              <Link to="/privacy-policy" className="text-primary underline">Privacy Policy</Link>, which complies 
              with the Google API Services User Data Policy, including the Limited Use requirements. By connecting 
              your Google account, you authorize us to access and use your Google data as described in our Privacy 
              Policy.
            </p>

            <h3 className="text-xl font-medium mt-4">7.2 Stripe Payment Processing</h3>
            <p>
              Payment processing is handled by Stripe. Your use of Stripe's services is subject to{" "}
              <a 
                href="https://stripe.com/legal" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Stripe's Terms of Service
              </a>
              . We are not responsible for the actions or inactions of Stripe.
            </p>

            <h3 className="text-xl font-medium mt-4">7.3 Third-Party Service Availability</h3>
            <p>
              We do not guarantee the availability or functionality of any third-party integrations. Third-party 
              services may change their terms, APIs, or availability at any time, which may affect the functionality 
              of related features in our Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Payment Terms</h2>
            <p>
              Certain features of the Service may require payment of fees. You agree to pay all applicable fees as 
              described on the Service. Fees are non-refundable except as required by law or as explicitly stated 
              otherwise.
            </p>
            <p>
              We reserve the right to change our pricing at any time. We will provide notice of pricing changes at 
              least 30 days before they take effect.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Intellectual Property</h2>
            <p>
              The Service, including its original content, features, functionality, design, and source code, is and 
              will remain the exclusive property of Smart Water Pools, LLC and its licensors. The Service is protected 
              by copyright, trademark, and other laws of the United States and foreign countries.
            </p>
            <p>
              Our trademarks, service marks, and trade dress may not be used in connection with any product or service 
              without our prior written consent.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Termination</h2>
            <p>
              We may terminate or suspend your access to the Service immediately, without prior notice or liability, 
              for any reason, including if you breach these Terms. Upon termination:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your right to use the Service will immediately cease.</li>
              <li>We may delete your account and associated data, subject to our data retention obligations.</li>
              <li>Any provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.</li>
            </ul>
            <p>
              You may terminate your account at any time by contacting us. Upon your request, we will delete your 
              account and associated data in accordance with our Privacy Policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">11. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, 
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS 
              FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
            </p>
            <p>
              We do not warrant that the Service will function uninterrupted, secure, or available at any particular 
              time or location, or that any defects or errors will be corrected.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">12. Limitation of Liability</h2>
            <p>
              IN NO EVENT SHALL SMART WATER POOLS, LLC, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR 
              AFFILIATES, BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, 
              INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, 
              RESULTING FROM:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your access to or use of or inability to access or use the Service.</li>
              <li>Any conduct or content of any third party on the Service.</li>
              <li>Any content obtained from the Service.</li>
              <li>Unauthorized access, use, or alteration of your transmissions or content.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">13. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless Smart Water Pools, LLC and its officers, directors, 
              employees, and agents from and against any claims, damages, obligations, losses, liabilities, costs, or 
              debt arising from your use of the Service, your violation of these Terms, or your violation of any rights 
              of a third party.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">14. Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of the State of Florida, 
              United States, without regard to its conflict of law provisions. Any legal action or proceeding arising 
              under these Terms will be brought exclusively in the courts located in the State of Florida.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">15. Changes to Terms</h2>
            <p>
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will 
              provide at least 30 days' notice before any new terms take effect. What constitutes a material change 
              will be determined at our sole discretion.
            </p>
            <p>
              By continuing to access or use our Service after any revisions become effective, you agree to be bound 
              by the revised Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">16. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="font-semibold">Smart Water Pools, LLC</p>
              <p><strong>Email:</strong> travis@smartwaterpools.com</p>
              <p><strong>Website:</strong> smartwaterpools.com</p>
            </div>
          </section>

          <div className="pt-6 border-t flex items-center justify-between">
            <Link to="/" className="text-primary hover:underline flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return to home page
            </Link>
            <Link to="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
