import React from "react";
import { Link } from "wouter";

export default function OAuthConsent() {
  return (
    <div className="container max-w-4xl py-12 mx-auto">
      <div className="space-y-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-4">OAuth Consent Information</h1>
          <p className="text-muted-foreground">Learn about our Google authentication integration</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">About Our Google Integration</h2>
          <p>
            SmartWater Pools Management System offers Google Sign-In as a convenient and secure authentication method.
            This page explains what information we collect and how we use it when you sign in with Google.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Information We Collect</h2>
          <p>
            When you sign in with Google, we receive the following information from your Google account:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Profile Information:</strong> Your name and profile picture to personalize your account</li>
            <li><strong>Email Address:</strong> To identify your account and send important notifications</li>
            <li><strong>Google ID:</strong> A unique identifier to link your Google account with our service</li>
          </ul>
          <p className="mt-4">
            We do not receive or store your Google password or access to other Google services unless you explicitly grant 
            such permissions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">How We Use This Information</h2>
          <p>
            The information we collect through Google Sign-In is used for the following purposes:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Creating and maintaining your account</li>
            <li>Providing personalized service experience</li>
            <li>Sending important notifications about your account or service</li>
            <li>Improving our authentication services</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Data Protection and Security</h2>
          <p>
            We take the security of your information seriously and implement appropriate measures to protect your data:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Secure encrypted connections for data transfer</li>
            <li>Regular security audits of our systems</li>
            <li>Strict access controls to personal information</li>
            <li>No sharing of your Google account information with third parties without your consent</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Managing Your Consent</h2>
          <p>
            You can review and manage the applications connected to your Google account at any time:
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Visit your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Account Permissions</a></li>
            <li>Find "SmartWater Pools Management System" in the list of connected applications</li>
            <li>Click "Remove Access" to revoke access</li>
          </ol>
          <p className="mt-4">
            Note: Revoking access will disconnect your Google account from our service, but your account with us will remain active.
            You may need to set up a password to continue using our service.
          </p>
        </section>

        <div className="pt-6 mt-8 border-t flex flex-col sm:flex-row justify-between">
          <Link to="/privacy-policy" className="text-primary hover:underline mb-2 sm:mb-0">
            Privacy Policy
          </Link>
          <Link to="/terms-of-service" className="text-primary hover:underline mb-2 sm:mb-0">
            Terms of Service
          </Link>
          <Link to="/" className="text-primary hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}