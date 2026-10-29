import { useEffect, useState } from "react";
import api, { errorMessage } from "./api";

// Finds the canteens this staff member can manage (admin: all) and remembers the selected one.
export default function useStaffCanteen() {
  const [canteens, setCanteens] = useState([]);
  const [canteenId, setCanteenIdState] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get("/auth/me"), api.get("/canteens")])
      .then(([meRes, listRes]) => {
        if (cancelled) return;
        const me = meRes.data.user;
        const mineIds = (me.managedCanteens || []).map(String);
        const mine =
          me.role === "admin"
            ? listRes.data
            : listRes.data.filter((c) => mineIds.includes(String(c._id)));
        setCanteens(mine);

        const saved = localStorage.getItem("staffCanteen");
        const pick = mine.find((c) => c._id === saved) || mine[0];
        if (pick) setCanteenIdState(pick._id);
        else setError("No canteen is assigned to your account. Ask the admin.");
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCanteenId = (id) => {
    localStorage.setItem("staffCanteen", id);
    setCanteenIdState(id);
  };

  const canteen = canteens.find((c) => c._id === canteenId) || null;
  return { canteens, canteen, canteenId, setCanteenId, error };
}