import '../app/globals.css'; // Corrected path to be root-relative for compilation
import React from 'react';

// Define the root layout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>TMDB Proxy Connectivity Tester</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      {/* Use the Inter font, and ensure the body fills the screen */}
      <body className="antialiased font-inter min-h-screen">
        {children}
      </body>
    </html>
  );
}
