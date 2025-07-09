import { createSlice } from '@reduxjs/toolkit';

const accountsSlice = createSlice({
  name: 'accounts',
  initialState: {
    accounts: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
});

export default accountsSlice.reducer;
