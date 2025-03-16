import React from "react";
import { Link } from "wouter";

export default function TermsOfService() {
  return (
    <div className="container max-w-4xl py-12 mx-auto">
      <div className="space-y-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Introduction</h2>
          <p>
            Welcome to SmartWater Pools Management System. These Terms of Service govern your use of our website, 
            application, and services. By accessing or using our services, you agree to be bound by these Terms of Service. 
            If you disagree with any part of the terms, you may not access the service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Accounts</h2>
          <p>
            When you create an account with us, you must provide accurate, complete, and current information. Failure 
            to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
          </p>
          <p>
            You are responsible for safeguarding the password used to access the service and for any activities or 
            actions under your password. You agree not to disclose your password to any third party. You must notify 
            us immediately upon becoming aware of any breach of security or unauthorized use of your account.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Service Usage</h2>
          <p>
            Our service allows you to manage pool maintenance, scheduling, client information, and related business operations.
            You agree to use the service only for legitimate business purposes related to pool management and maintenance.
          </p>
          <p>
            You agree not to use the service:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>In any way that violates any applicable federal, state, local, or international law or regulation.</li>
            <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail," "chain letter," "spam," or any other similar solicitation.</li>
            <li>To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity.</li>
            <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the service.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Google Sign-In</h2>
          <p>
            By using Google Sign-In, you agree to Google's Terms of Service and Privacy Policy. When you authenticate with
            Google, we store certain profile information necessary to provide our services, such as your name and email address.
          </p>
          <p>
            We do not control the authentication process provided by Google and are not responsible for any issues that arise
            during the authentication process on Google's platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Intellectual Property</h2>
          <p>
            The service and its original content, features, and functionality are and will remain the exclusive property of
            SmartWater Pools Management System and its licensors. The service is protected by copyright, trademark, and other
            laws. Our trademarks and trade dress may not be used in connection with any product or service without the prior
            written consent.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever,
            including without limitation if you breach the Terms. Upon termination, your right to use the service will immediately
            cease. If you wish to terminate your account, you may simply discontinue using the service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Limitation of Liability</h2>
          <p>
            In no event shall SmartWater Pools Management System, nor its directors, employees, partners, agents, suppliers, or
            affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without
            limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use
            of or inability to access or use the service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material,
            we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change
            will be determined at our sole discretion.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> terms@smartwaterpools.com<br />
            <strong>Phone:</strong> (555) 123-4567<br />
            <strong>Address:</strong> 123 Main Street, Suite 100, Anytown, USA 12345
          </p>
        </section>

        <div className="pt-6 border-t">
          <Link to="/" className="text-primary hover:underline">
            &larr; Return to home page
          </Link>
        </div>
      </div>
    </div>
  );
}