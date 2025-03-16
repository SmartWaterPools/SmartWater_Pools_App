import React from "react";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="container max-w-4xl py-12 mx-auto">
      <div className="space-y-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Introduction</h2>
          <p>
            Welcome to SmartWater Pools Management System ("we," "our," or "us"). We respect your privacy and are committed 
            to protecting your personal data. This privacy policy will inform you about how we look after your personal data 
            when you visit our website and tell you about your privacy rights and how the law protects you.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Data We Collect</h2>
          <p>
            We may collect, use, store, and transfer different kinds of personal data about you which we have grouped together as follows:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
            <li><strong>Contact Data</strong> includes billing address, email address, and telephone numbers.</li>
            <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version.</li>
            <li><strong>Profile Data</strong> includes your username and password, your preferences, feedback, and survey responses.</li>
            <li><strong>Usage Data</strong> includes information about how you use our website and services.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. How We Use Your Data</h2>
          <p>
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To register you as a new customer.</li>
            <li>To process and deliver your service.</li>
            <li>To manage our relationship with you.</li>
            <li>To improve our website, products/services, marketing, or customer relationships.</li>
            <li>To recommend products or services that may interest you.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Google Sign-In</h2>
          <p>
            When you sign in using Google, we collect information that Google provides to us, which may include your name, 
            email address, and profile picture. We use this information to create and manage your account with us. We do not 
            share this information with third parties except as necessary to provide our services or as required by law.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Data Security</h2>
          <p>
            We have implemented appropriate security measures to prevent your personal data from being accidentally lost, 
            used, or accessed in an unauthorized way, altered, or disclosed. We limit access to your personal data to those 
            employees, agents, contractors, and other third parties who have a business need to know.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Your Legal Rights</h2>
          <p>
            Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Request access to your personal data.</li>
            <li>Request correction of your personal data.</li>
            <li>Request erasure of your personal data.</li>
            <li>Object to processing of your personal data.</li>
            <li>Request restriction of processing your personal data.</li>
            <li>Request transfer of your personal data.</li>
            <li>Right to withdraw consent.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Contact Us</h2>
          <p>
            If you have any questions about this privacy policy or our privacy practices, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> privacy@smartwaterpools.com<br />
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