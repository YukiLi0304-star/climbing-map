import { Linking, Platform } from 'react-native';

type Coordinates = {
  latitude: number;
  longitude: number;
};

export const useOpenMap = () => {
  const openMap = async (coords: Coordinates, name: string) => {
    const { latitude, longitude } = coords;
    const label = encodeURIComponent(name);
    
    if (Platform.OS === 'ios') {
      const url = `maps:0,0?q=${label}@${latitude},${longitude}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) return Linking.openURL(url);
    } else {
      const url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
      const supported = await Linking.canOpenURL(url);
      if (supported) return Linking.openURL(url);
    }
    
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    return Linking.openURL(webUrl);
  };

  return { openMap };
};