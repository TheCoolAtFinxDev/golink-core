import { environment } from '../environments/environment';

export const GlobalComponent = {
    // Api Calling
    API_URL : environment.apiBaseUrl,
    headerToken : {'Authorization': `Bearer ${sessionStorage.getItem('token')}`},

    // Auth Api
    AUTH_API: environment.authApiBaseUrl,

    
    // Products Api
    product:'apps/product',
    productDelete:'apps/product/',

    // Orders Api
    order:'apps/order',
    orderId:'apps/order/',

    // Customers Api
    customer:'apps/customer',
}
