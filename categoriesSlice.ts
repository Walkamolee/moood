import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { CategoriesState, Category } from '../../types';

// Mock categories data
const mockCategories: Category[] = [
  {
    id: 'income',
    name: 'Income',
    color: '#4CAF50',
    icon: 'attach-money',
    isSystemCategory: true,
  },
  {
    id: 'food',
    name: 'Food & Dining',
    color: '#FF9800',
    icon: 'restaurant',
    isSystemCategory: true,
  },
  {
    id: 'groceries',
    name: 'Groceries',
    parentCategoryId: 'food',
    color: '#FF9800',
    icon: 'shopping-cart',
    isSystemCategory: true,
  },
  {
    id: 'restaurants',
    name: 'Restaurants',
    parentCategoryId: 'food',
    color: '#FF9800',
    icon: 'restaurant',
    isSystemCategory: true,
  },
  {
    id: 'transportation',
    name: 'Transportation',
    color: '#2196F3',
    icon: 'directions-car',
    isSystemCategory: true,
  },
  {
    id: 'gas',
    name: 'Gas & Fuel',
    parentCategoryId: 'transportation',
    color: '#2196F3',
    icon: 'local-gas-station',
    isSystemCategory: true,
  },
  {
    id: 'public-transport',
    name: 'Public Transportation',
    parentCategoryId: 'transportation',
    color: '#2196F3',
    icon: 'train',
    isSystemCategory: true,
  },
  {
    id: 'shopping',
    name: 'Shopping',
    color: '#E91E63',
    icon: 'shopping-bag',
    isSystemCategory: true,
  },
  {
    id: 'clothing',
    name: 'Clothing',
    parentCategoryId: 'shopping',
    color: '#E91E63',
    icon: 'checkroom',
    isSystemCategory: true,
  },
  {
    id: 'electronics',
    name: 'Electronics',
    parentCategoryId: 'shopping',
    color: '#E91E63',
    icon: 'devices',
    isSystemCategory: true,
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    color: '#9C27B0',
    icon: 'movie',
    isSystemCategory: true,
  },
  {
    id: 'streaming',
    name: 'Streaming Services',
    parentCategoryId: 'entertainment',
    color: '#9C27B0',
    icon: 'play-circle-filled',
    isSystemCategory: true,
  },
  {
    id: 'movies',
    name: 'Movies & Theater',
    parentCategoryId: 'entertainment',
    color: '#9C27B0',
    icon: 'movie',
    isSystemCategory: true,
  },
  {
    id: 'housing',
    name: 'Housing',
    color: '#795548',
    icon: 'home',
    isSystemCategory: true,
  },
  {
    id: 'rent',
    name: 'Rent',
    parentCategoryId: 'housing',
    color: '#795548',
    icon: 'home',
    isSystemCategory: true,
  },
  {
    id: 'utilities',
    name: 'Utilities',
    parentCategoryId: 'housing',
    color: '#795548',
    icon: 'electrical-services',
    isSystemCategory: true,
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    color: '#F44336',
    icon: 'local-hospital',
    isSystemCategory: true,
  },
  {
    id: 'insurance',
    name: 'Insurance',
    color: '#607D8B',
    icon: 'security',
    isSystemCategory: true,
  },
  {
    id: 'education',
    name: 'Education',
    color: '#3F51B5',
    icon: 'school',
    isSystemCategory: true,
  },
  {
    id: 'personal-care',
    name: 'Personal Care',
    color: '#CDDC39',
    icon: 'spa',
    isSystemCategory: true,
  },
  {
    id: 'travel',
    name: 'Travel',
    color: '#00BCD4',
    icon: 'flight',
    isSystemCategory: true,
  },
  {
    id: 'business',
    name: 'Business',
    color: '#8BC34A',
    icon: 'business',
    isSystemCategory: true,
  },
  {
    id: 'taxes',
    name: 'Taxes',
    color: '#FF5722',
    icon: 'account-balance',
    isSystemCategory: true,
  },
  {
    id: 'fees',
    name: 'Fees & Charges',
    color: '#9E9E9E',
    icon: 'money-off',
    isSystemCategory: true,
  },
  {
    id: 'transfer',
    name: 'Transfer',
    color: '#FFC107',
    icon: 'swap-horiz',
    isSystemCategory: true,
  },
  {
    id: 'uncategorized',
    name: 'Uncategorized',
    color: '#757575',
    icon: 'help-outline',
    isSystemCategory: true,
  },
];

// Mock API calls
const mockFetchCategories = async (): Promise<Category[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockCategories;
};

const mockCreateCategory = async (categoryData: Omit<Category, 'id'>): Promise<Category> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const newCategory: Category = {
    ...categoryData,
    id: Math.random().toString(36).substr(2, 9),
    isSystemCategory: false,
  };
  
  return newCategory;
};

const mockUpdateCategory = async (
  categoryId: string,
  updates: Partial<Category>
): Promise<Category> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const category = mockCategories.find(c => c.id === categoryId);
  if (!category) {
    throw new Error('Category not found');
  }
  
  return { ...category, ...updates };
};

const mockDeleteCategory = async (categoryId: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const category = mockCategories.find(c => c.id === categoryId);
  if (!category) {
    throw new Error('Category not found');
  }
  
  if (category.isSystemCategory) {
    throw new Error('Cannot delete system category');
  }
  
  return categoryId;
};

// Async thunks
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const categories = await mockFetchCategories();
      return categories;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (categoryData: Omit<Category, 'id'>, { rejectWithValue }) => {
    try {
      const newCategory = await mockCreateCategory(categoryData);
      return newCategory;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async (
    { categoryId, updates }: { categoryId: string; updates: Partial<Category> },
    { rejectWithValue }
  ) => {
    try {
      const updatedCategory = await mockUpdateCategory(categoryId, updates);
      return updatedCategory;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (categoryId: string, { rejectWithValue }) => {
    try {
      await mockDeleteCategory(categoryId);
      return categoryId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState: CategoriesState = {
  categories: [],
  isLoading: false,
  error: null,
};

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create category
    builder
      .addCase(createCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories.push(action.payload);
        state.error = null;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update category
    builder
      .addCase(updateCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.categories.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete category
    builder
      .addCase(deleteCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = state.categories.filter(c => c.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = categoriesSlice.actions;
export default categoriesSlice.reducer;

