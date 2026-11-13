import { loadEnvironmentFiles } from './config/envFiles';

// Load environment files first before any application module is imported
loadEnvironmentFiles(__dirname);

// Now dynamically import the application server entrypoint
void import('./index');
