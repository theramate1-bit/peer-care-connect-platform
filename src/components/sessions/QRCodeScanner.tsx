import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Camera, 
  CameraOff, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsQR from 'jsqr';

interface QRCodeScannerProps {
  onScanSuccess: (data: string) => void;
  onScanError?: (error: string) => void;
  className?: string;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ 
  onScanSuccess, 
  onScanError,
  className 
}) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      streamRef.current = stream;
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
        
        // Start scanning for QR codes
        startQRDetection();
      }
      
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Camera access denied or not available');
      setHasPermission(false);
      
      if (onScanError) {
        onScanError('Camera access denied or not available');
      }
      
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
  };

  const startQRDetection = () => {
    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current || !isScanning) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data for QR code detection
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Simple QR code detection (in a real app, you'd use a library like jsQR)
      const qrData = detectQRCode(imageData);
      
      if (qrData) {
        handleQRCodeDetected(qrData);
        return; // Stop scanning after successful detection
      }
      
      // Continue scanning
      if (isScanning) {
        requestAnimationFrame(scanFrame);
      }
    };
    
    scanFrame();
  };

  const detectQRCode = (imageData: ImageData): string | null => {
    try {
      // Use jsQR library for actual QR code detection
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        return code.data;
      }

      return null;
    } catch (error) {
      console.error('QR detection error:', error);
      return null;
    }
  };

  const handleQRCodeDetected = (data: string) => {
    setScannedData(data);
    setIsScanning(false);
    stopScanning();
    
    onScanSuccess(data);
    
    toast({
      title: "QR Code Scanned",
      description: "Session check-in successful!"
    });
  };

  const resetScanner = () => {
    setScannedData(null);
    setError(null);
    stopScanning();
  };

  const getCameraStatus = () => {
    if (error) return 'error';
    if (scannedData) return 'success';
    if (isScanning) return 'scanning';
    if (hasPermission === false) return 'denied';
    return 'idle';
  };

  const getStatusIcon = () => {
    const status = getCameraStatus();
    
    switch (status) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'error':
      case 'denied':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'scanning':
        return <Camera className="h-6 w-6 text-blue-600 animate-pulse" />;
      default:
        return <QrCode className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    const status = getCameraStatus();
    
    switch (status) {
      case 'success':
        return 'QR Code Scanned Successfully';
      case 'error':
        return 'Camera Error';
      case 'denied':
        return 'Camera Permission Denied';
      case 'scanning':
        return 'Scanning for QR Code...';
      default:
        return 'Ready to Scan';
    }
  };

  const getStatusColor = () => {
    const status = getCameraStatus();
    
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
      case 'denied':
        return 'bg-red-100 text-red-800';
      case 'scanning':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          QR Code Scanner
        </CardTitle>
        <CardDescription>Scan the QR code to check in for your session</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Camera Preview */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              {!isScanning && !scannedData && (
                <div className="text-center">
                  <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">Camera not active</p>
                </div>
              )}
              
              {isScanning && (
                <div className="relative">
                  {/* Scanning frame */}
                  <div className="w-48 h-48 border-2 border-blue-500 rounded-lg animate-pulse">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                  </div>
                </div>
              )}
              
              {scannedData && (
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <p className="text-sm text-green-600 font-medium">Check-in Successful!</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Hidden canvas for QR detection */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Status */}
          <div className="flex items-center justify-center gap-2">
            {getStatusIcon()}
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}
          
          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            {!isScanning && !scannedData && (
              <Button onClick={startScanning} className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Start Scanning
              </Button>
            )}
            
            {isScanning && (
              <Button onClick={stopScanning} variant="outline" className="flex items-center gap-2">
                <CameraOff className="h-4 w-4" />
                Stop Scanning
              </Button>
            )}
            
            {scannedData && (
              <Button onClick={resetScanner} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Scan Again
              </Button>
            )}
          </div>
          
          {/* Instructions */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Position the QR code within the frame to scan</p>
            <p>Make sure the code is well-lit and clearly visible</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
