import { useEffect, useState } from "react";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/user/", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setChecking(false);
      }
    };
    fetchUser();
  }, []);

  return { user, checking };
}
