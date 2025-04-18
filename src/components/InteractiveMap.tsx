import React, { useRef } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

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

const libraries: ("marker")[] = ['marker']; // Define libraries array outside component

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  apiKey,
  center,
  zoom = 15, // Default zoom level
  mapContainerStyle = defaultMapContainerStyle,
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);

  if (!apiKey) {
    console.error("Google Maps API key is missing.");
    return <div style={mapContainerStyle} className="bg-gray-200 flex items-center justify-center text-red-500 text-sm">API Key Missing</div>;
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={libraries}
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
        <Marker position={center} />
      </GoogleMap>
    </LoadScript>
  );
};

export default InteractiveMap; 