import React, { useRef, useEffect } from 'react';
import { GoogleMap, LoadScript } from '@react-google-maps/api';

interface InteractiveMapProps {
  apiKey: string;
  center: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  mapContainerStyle?: React.CSSProperties;
}

const defaultMapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%', // Ensure container has height
  borderRadius: '0.375rem', // Match existing rounded style
};

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  apiKey,
  center,
  zoom = 15, // Default zoom level
  mapContainerStyle = defaultMapContainerStyle,
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (mapRef.current && (window as any).google?.maps?.marker?.AdvancedMarkerElement) {
      // Remove previous marker if it exists
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
      // Create new AdvancedMarkerElement
      const AdvancedMarkerElement = (window as any).google.maps.marker.AdvancedMarkerElement;
      markerRef.current = new AdvancedMarkerElement({
        map: mapRef.current,
        position: center,
      });
    }
    // Cleanup on unmount
    return () => {
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
    };
  }, [center]);

  if (!apiKey) {
    console.error("Google Maps API key is missing.");
    return <div style={mapContainerStyle} className="bg-gray-200 flex items-center justify-center text-red-500 text-sm">API Key Missing</div>;
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={['marker']}
      loadingElement={<div style={mapContainerStyle} className="bg-gray-200 flex items-center justify-center text-gray-500">Loading Map...</div>}
      onError={(error) => {
        console.error("Error loading Google Maps script:", error);
        // Optionally return an error message UI here
      }}
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        options={{
          disableDefaultUI: true, // Optional: hide default controls
          zoomControl: true,      // Optional: show zoom control
        }}
        onLoad={map => { mapRef.current = map; }}
      >
        {/* AdvancedMarkerElement is added manually */}
      </GoogleMap>
    </LoadScript>
  );
};

export default InteractiveMap; 