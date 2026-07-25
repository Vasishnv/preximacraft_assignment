import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./Context/authContext"; 

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
            {children}
        </AuthProvider>
        
      </body>
    </html>
  );
}
