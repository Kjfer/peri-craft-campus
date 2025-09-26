import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { exchangeRateService } from '@/lib/exchangeRateService';
import { useToast } from '@/hooks/use-toast';

interface ExchangeRateDisplayProps {
  showDetails?: boolean;
  showRefreshButton?: boolean;
  className?: string;
}

export function ExchangeRateDisplay({ 
  showDetails = false, 
  showRefreshButton = false, 
  className = "" 
}: ExchangeRateDisplayProps) {
  const { toast } = useToast();
  const [rateInfo, setRateInfo] = useState<{
    rate: number;
    cached: boolean;
    lastUpdated: Date | null;
    source: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRateInfo();
  }, []);

  const loadRateInfo = async () => {
    try {
      setLoading(true);
      const info = await exchangeRateService.getRateInfo();
      setRateInfo(info);
    } catch (error) {
      console.error('Failed to load exchange rate info:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información de tasa de cambio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const newRate = await exchangeRateService.forceRefresh();
      
      toast({
        title: "Tasa actualizada",
        description: `Nueva tasa: S/${newRate.toFixed(4)} por USD`,
      });
      
      // Reload rate info after refresh
      await loadRateInfo();
      
    } catch (error) {
      console.error('Failed to refresh exchange rate:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la tasa de cambio",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getSourceBadge = (source: string, cached: boolean) => {
    if (source === 'fallback') {
      return <Badge variant="destructive" className="text-xs">BCRP Fijo</Badge>;
    }
    
    if (cached) {
      return <Badge variant="secondary" className="text-xs">Cache BCRP</Badge>;
    }
    
    return <Badge variant="default" className="text-xs">BCRP en vivo</Badge>;
  };

  const getSourceIcon = (source: string, cached: boolean) => {
    if (source === 'fallback') {
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    }
    
    if (cached) {
      return <Clock className="w-4 h-4 text-blue-500" />;
    }
    
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span className="text-sm text-muted-foreground">Cargando tasa de cambio...</span>
      </div>
    );
  }

  if (!rateInfo) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No se pudo obtener la tasa de cambio
        </AlertDescription>
      </Alert>
    );
  }

  // Simple display for inline use
  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getSourceIcon(rateInfo.source, rateInfo.cached)}
        <span className="text-sm font-medium">
          1 USD = S/{rateInfo.rate.toFixed(4)}
        </span>
        {getSourceBadge(rateInfo.source, rateInfo.cached)}
        {showRefreshButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  // Detailed card display
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Tasa de Cambio USD/PEN</span>
          </CardTitle>
          {showRefreshButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          )}
        </div>
        <CardDescription>
          Tasa oficial basada en BCRP/SUNAT
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getSourceIcon(rateInfo.source, rateInfo.cached)}
            <div>
              <p className="text-2xl font-bold">
                S/{rateInfo.rate.toFixed(4)}
              </p>
              <p className="text-sm text-muted-foreground">
                por cada USD
              </p>
            </div>
          </div>
          {getSourceBadge(rateInfo.source, rateInfo.cached)}
        </div>

        {rateInfo.lastUpdated && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Última actualización: {' '}
              {rateInfo.lastUpdated.toLocaleString('es-PE', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}

        {rateInfo.source === 'fallback' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Usando tasa de respaldo BCRP (S/ 3.50). Las APIs externas no están disponibles.
            </AlertDescription>
          </Alert>
        )}

        {rateInfo.cached && rateInfo.source !== 'fallback' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Tasa basada en BCRP. Se actualiza automáticamente cada 10 minutos.
            </AlertDescription>
          </Alert>
        )}

        {!rateInfo.cached && rateInfo.source === 'api' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-xs text-green-700">
              Tasa actualizada desde fuentes oficiales (BCRP/SUNAT). Precisión: ±0.5%
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default ExchangeRateDisplay;