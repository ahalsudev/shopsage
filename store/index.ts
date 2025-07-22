import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import expertReducer from './slices/expertSlice';
import sessionReducer from './slices/sessionSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        experts: expertReducer,
        sessions: sessionReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST'],
            },
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;