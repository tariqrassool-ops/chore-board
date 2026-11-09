// Background handlers must be registered before the app renders, so they load first.
import './src/lib/background';

// Loaded after the handler is registered (a static import would be hoisted above it).
require('expo-router/entry');
