import { useState } from "react";

import { getConfig, setFavorites } from "../config/config";
import type { Favorite } from "../loadConfig";
import { toggleFavorite } from "../utils/favorites";

const useFavorites = () => {
  const [favorites, setFavoritesState] = useState(
    () => getConfig().scripts.favorites,
  );
  const [error, setError] = useState<string | null>(null);

  const toggle = (favorite: Favorite): Favorite[] => {
    const next = toggleFavorite(favorites, favorite);
    setFavoritesState(next);
    try {
      setFavorites(next);
      setError(null);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
    return next;
  };

  return { favorites, toggle, error };
};

export default useFavorites;
