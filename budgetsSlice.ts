import { createSlice } from '@reduxjs/toolkit';

const budgetsSlice = createSlice({
  name: 'budgets',
  initialState: {
    budgets: [],
    budgetPeriods: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
});

export default budgetsSlice.reducer;
