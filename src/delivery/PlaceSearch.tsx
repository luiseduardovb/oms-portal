"use client";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "./googleMaps";

export interface PickedPlace {
  lat: number;
  lng: number;
  label: string;
}

interface Option {
  label: string;
  prediction: google.maps.places.PlacePrediction;
}

/** An address search with suggestions (Google Places). Picking one gives
 * its coordinates. */
export function PlaceSearch({
  onPick,
  label,
}: {
  onPick: (place: PickedPlace) => void;
  label?: string;
}) {
  const t = useTranslations("delivery.search");
  const [text, setText] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );

  useEffect(() => {
    if (text.trim().length < 3) return;
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const maps = await loadGoogleMaps();
        const { AutocompleteSuggestion, AutocompleteSessionToken } =
          (await maps.importLibrary("places")) as google.maps.PlacesLibrary;
        token.current ??= new AutocompleteSessionToken();
        const { suggestions } =
          await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: text,
            includedRegionCodes: ["hn"],
            language: "es",
            sessionToken: token.current,
          });
        if (!live) return;
        setOptions(
          suggestions
            .filter((s) => s.placePrediction)
            .map((s) => ({
              label: s.placePrediction!.text.text,
              prediction: s.placePrediction!,
            })),
        );
      } catch {
        if (live) setOptions([]);
      }
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [text]);

  return (
    <Autocomplete
      options={text.trim().length < 3 ? [] : options}
      filterOptions={(all) => all}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(a, b) => a.label === b.label}
      inputValue={text}
      onInputChange={(_event, value) => setText(value)}
      noOptionsText={text.trim().length < 3 ? t("hint") : t("none")}
      onChange={async (_event, option) => {
        if (!option) return;
        const place = option.prediction.toPlace();
        await place.fetchFields({ fields: ["location", "formattedAddress"] });
        token.current = null; // one search session per chosen address
        if (place.location) {
          onPick({
            lat: place.location.lat(),
            lng: place.location.lng(),
            label: place.formattedAddress ?? option.label,
          });
        }
      }}
      renderInput={(params) => (
        <TextField {...params} label={label ?? t("label")} size="small" />
      )}
    />
  );
}
