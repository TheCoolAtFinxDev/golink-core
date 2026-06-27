import { createAction, props } from '@ngrx/store';

export const changelayout = createAction('[Layout] Change Layout', props<{ layout: string }>());
export const changeMode = createAction('[Layout] Change Mode', props<{ mode: string }>());
export const changeLayoutWidth = createAction('[Layout] Change Width', props<{ layoutWidth: string }>());
export const changeLayoutPosition = createAction('[Layout] Change Position', props<{ layoutPosition: string }>());
export const changeTopbar = createAction('[Layout] Change Topbar', props<{ topbarColor: string }>());
export const changeSidebarSize = createAction('[Layout] Change Sidebar Size', props<{ sidebarSize: string }>());
export const changeSidebarView = createAction('[Layout] Change Sidebar View', props<{ sidebarView: string }>());
export const changeSidebarColor = createAction('[Layout] Change Sidebar Color', props<{ sidebarColor: string }>());
export const changeSidebarImage = createAction('[Layout] Change Sidebar Image', props<{ sidebarImage: string }>());
export const changeSidebarVisibility = createAction('[Layout] Change Sidebar Visibility', props<{ sidebarvisibility: string }>());
export const changeTheme = createAction('[Layout] Change Theme', props<{ theme: string }>());
export const changeThemeColor = createAction('[Layout] Change Theme Color', props<{ themecolor: string }>());
export const changeBackgrounImage = createAction('[Layout] Change Background Image', props<{ backgroundImage: string }>());
export const changeDataPreloader = createAction('[Layout] Change Preloader', props<{ Preloader: string }>());
