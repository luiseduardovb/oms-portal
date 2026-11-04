import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@/api/baseApi";
import { sessionReducer } from "@/auth/sessionSlice";

export function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      session: sessionReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
