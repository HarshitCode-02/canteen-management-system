import { Outlet } from "react-router-dom";
import Footer from "./Footer";

export default function PublicLayout() {
  return (
    <div className="app-shell">
      <main className="container app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
