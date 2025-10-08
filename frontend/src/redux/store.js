import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./userSlice"
import ownerSlice from "./ownerSlice"
import mapSlice from "./mapSlice"
export const store=configureStore({
    reducer:{
        user:userSlice,
        owner:ownerSlice,
        map:mapSlice
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['user/setSocket'],
                ignoredPaths: ['user.socket'],
            },
            immutableCheck: {
                warnAfter: 128, // Increase warning threshold from 32ms to 128ms
                ignoredPaths: ['user.socket'], // Ignore socket object in immutability checks
            },
        }),
})