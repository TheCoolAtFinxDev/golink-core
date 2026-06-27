import { createReducer, on } from '@ngrx/store';
import {
  changelayout, changeMode, changeLayoutWidth, changeLayoutPosition,
  changeTopbar, changeSidebarSize, changeSidebarView, changeSidebarColor,
  changeSidebarImage, changeSidebarVisibility, changeTheme, changeThemeColor,
  changeBackgrounImage, changeDataPreloader
} from './layout-action';

export interface LayoutState {
  LAYOUT: string;
  LAYOUT_MODE: string;
  LAYOUT_WIDTH: string;
  LAYOUT_POSITION: string;
  TOPBAR: string;
  SIDEBAR_SIZE: string;
  SIDEBAR_VIEW: string;
  SIDEBAR_COLOR: string;
  SIDEBAR_IMAGE: string;
  SIDEBAR_VISIBILITY: string;
  LAYOUT_THEME: string;
  LAYOUT_THEME_COLOR: string;
  DATA_PRELOADER: string;
}

export const initialState: LayoutState = {
  LAYOUT: 'vertical',
  LAYOUT_MODE: 'light',
  LAYOUT_WIDTH: 'lg',
  LAYOUT_POSITION: 'fixed',
  TOPBAR: 'light',
  SIDEBAR_SIZE: 'lg',
  SIDEBAR_VIEW: 'default',
  SIDEBAR_COLOR: 'dark',
  SIDEBAR_IMAGE: 'none',
  SIDEBAR_VISIBILITY: 'show',
  LAYOUT_THEME: 'default',
  LAYOUT_THEME_COLOR: 'default',
  DATA_PRELOADER: 'disable',
};

export const layoutReducer = createReducer(
  initialState,
  on(changelayout, (state, { layout }) => ({ ...state, LAYOUT: layout })),
  on(changeMode, (state, { mode }) => ({ ...state, LAYOUT_MODE: mode })),
  on(changeLayoutWidth, (state, { layoutWidth }) => ({ ...state, LAYOUT_WIDTH: layoutWidth })),
  on(changeLayoutPosition, (state, { layoutPosition }) => ({ ...state, LAYOUT_POSITION: layoutPosition })),
  on(changeTopbar, (state, { topbarColor }) => ({ ...state, TOPBAR: topbarColor })),
  on(changeSidebarSize, (state, { sidebarSize }) => ({ ...state, SIDEBAR_SIZE: sidebarSize })),
  on(changeSidebarView, (state, { sidebarView }) => ({ ...state, SIDEBAR_VIEW: sidebarView })),
  on(changeSidebarColor, (state, { sidebarColor }) => ({ ...state, SIDEBAR_COLOR: sidebarColor })),
  on(changeSidebarImage, (state, { sidebarImage }) => ({ ...state, SIDEBAR_IMAGE: sidebarImage })),
  on(changeSidebarVisibility, (state, { sidebarvisibility }) => ({ ...state, SIDEBAR_VISIBILITY: sidebarvisibility })),
  on(changeTheme, (state, { theme }) => ({ ...state, LAYOUT_THEME: theme })),
  on(changeThemeColor, (state, { themecolor }) => ({ ...state, LAYOUT_THEME_COLOR: themecolor })),
  on(changeBackgrounImage, (state, { backgroundImage }) => ({ ...state, SIDEBAR_IMAGE: backgroundImage })),
  on(changeDataPreloader, (state, { Preloader }) => ({ ...state, DATA_PRELOADER: Preloader })),
);
