import { createSlice } from "@reduxjs/toolkit";

/** `unknown` until the first refresh attempt finishes on page load. */
export type SessionStatus = "unknown" | "authenticated" | "anonymous";

const sessionSlice = createSlice({
  name: "session",
  initialState: { status: "unknown" as SessionStatus },
  reducers: {
    sessionStarted: (state) => {
      state.status = "authenticated";
    },
    sessionEnded: (state) => {
      state.status = "anonymous";
    },
  },
});

export const { sessionStarted, sessionEnded } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
