import { configureStore } from '@reduxjs/toolkit'
import expertReducer from './slices/expertSlice'
import sessionReducer from './slices/sessionSlice'
import paymentReducer from './slices/paymentSlice'

export const store = configureStore({
  reducer: {
    experts: expertReducer,
    sessions: sessionReducer,
    payments: paymentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
