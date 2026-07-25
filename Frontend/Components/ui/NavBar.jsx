import Link from "next/link";

export default function Navbar({children}) {
  return (
    <>
        <nav style={{padding: "1rem" }}>
      <ul style={{ listStyle: "none", display: "flex", gap: "1rem", margin: 0, padding: 0 }}>
        <li><Link href="/dashboard" style={{ color: "white", textDecoration: "none" }}>Dashboard</Link></li>
        <li><Link href="/pricing" style={{ color: "white", textDecoration: "none" }}>Pricing</Link></li>
        <li><Link href="/login" style={{ color: "white", textDecoration: "none" }}>Login</Link></li>
      </ul>
    </nav>
    <>
    {children}
    </>
    </>

    
  );
}