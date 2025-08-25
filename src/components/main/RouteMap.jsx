// src/hooks/useRoute.js
import { useState, useCallback } from "react";
import baseApi from "../api/baseApi";

/**
 * places: [{ lat, lng }, ...] 형식
 * 반환: routeCoords: [{ lat, lng }, ...]
 */
export const useRoute = () => {
  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getRoute = useCallback(async (places) => {
    if (!places || places.length < 2) return;

    setLoading(true);
    setError(null);

    try {
      const origin = `${places[0].lng},${places[0].lat}`;
      const destination = `${places[places.length - 1].lng},${
        places[places.length - 1].lat
      }`;
      const waypoints =
        places.length > 2
          ? places
              .slice(1, -1)
              .map((p) => `${p.lng},${p.lat}`)
              .join("|")
          : "";

      const res = await baseApi.get(
        `/directions?origin=${origin}&destination=${destination}&waypoints=${waypoints}`
      );

      // 백엔드에서 반환된 data가 문자열일 경우 parse
      const data =
        typeof res.data.data === "string"
          ? JSON.parse(res.data.data)
          : res.data.data;

      // roads[].vertexes → [{lat, lng}, ...]
      const roads = data.routes[0].sections[0].roads || [];
      const coords = [];
      roads.forEach((road) => {
        const v = road.vertexes;
        for (let i = 0; i < v.length; i += 2) {
          coords.push({ lat: v[i + 1], lng: v[i] });
        }
      });

      setRouteCoords(coords);
      return coords;
    } catch (err) {
      console.error("길찾기 API 실패:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { routeCoords, getRoute, loading, error };
};
