import "./globals.css";

export const metadata = {
  title: "Daily Target Board",
  description: "A JIRA-style board for planning personal work."
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
