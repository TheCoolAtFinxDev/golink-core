import { createSelector } from '@ngrx/store';
import { RootReducerState } from 'src/app/store';

const selectLayout = (state: RootReducerState) => state.layout;

export const getLayoutTheme = createSelector(selectLayout, s => s.LAYOUT);
export const getLayoutMode = createSelector(selectLayout, s => s.LAYOUT_MODE);
export const getLayoutWith = createSelector(selectLayout, s => s.LAYOUT_WIDTH);
export const getLayoutPosition = createSelector(selectLayout, s => s.LAYOUT_POSITION);
export const getTopbarColor = createSelector(selectLayout, s => s.TOPBAR);
export const getSidebarSize = createSelector(selectLayout, s => s.SIDEBAR_SIZE);
export const getSidebarView = createSelector(selectLayout, s => s.SIDEBAR_VIEW);
export const getSidebarColor = createSelector(selectLayout, s => s.SIDEBAR_COLOR);
export const getSidebarImage = createSelector(selectLayout, s => s.SIDEBAR_IMAGE);
export const getSidebarVisibilitye = createSelector(selectLayout, s => s.SIDEBAR_VISIBILITY);
export const getTheme = createSelector(selectLayout, s => s.LAYOUT_THEME);
export const getThemeColor = createSelector(selectLayout, s => s.LAYOUT_THEME_COLOR);
export const getPreloader = createSelector(selectLayout, s => s.DATA_PRELOADER);
export const getBackgroundImage = createSelector(selectLayout, s => s.SIDEBAR_IMAGE);
