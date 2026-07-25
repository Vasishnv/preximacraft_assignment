import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./Context/authContext"; 
import Navbar from "@/Components/ui/NavBar";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
       
        <AuthProvider>
          <Navbar>
            {children}
          </Navbar>
        </AuthProvider>
        
        
      </body>
    </html>
  );
}
