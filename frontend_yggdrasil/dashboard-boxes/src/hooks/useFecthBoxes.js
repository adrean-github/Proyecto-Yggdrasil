import { useState, useEffect } from "react";

export default function useFetchBoxes(url) {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBoxes = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Error al obtener los datos");
        const data = await response.json();
        setBoxes(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBoxes();
  }, [url]);

  return { boxes, loading, error };
}
