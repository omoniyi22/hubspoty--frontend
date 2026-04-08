// frontend/src/components/ConnectionStatus.tsx
import React from 'react'
import { Button } from './../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './../components/ui/card'
import { Plug, PlugZap, Loader2 } from 'lucide-react'
import { useToast } from './../hooks/use-toast'

interface ConnectionStatusProps {
  instanceId: string
  isConnected: boolean
  portalId?: string
  onConnect: () => void
  onDisconnect: () => void
  isLoading?: boolean
}

export function ConnectionStatus({ 
  instanceId, 
  isConnected, 
  portalId, 
  onConnect, 
  onDisconnect, 
  isLoading 
}: ConnectionStatusProps) {
  const { toast } = useToast()

  const handleDisconnect = async () => {
    try {
      await onDisconnect()
      toast({
        title: "Disconnected",
        description: "HubSpot account has been disconnected successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect HubSpot account.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isConnected ? (
            <PlugZap className="h-5 w-5 text-green-500" />
          ) : (
            <Plug className="h-5 w-5 text-gray-500" />
          )}
          HubSpot Connection
        </CardTitle>
        <CardDescription>
          {isConnected 
            ? `Connected to HubSpot portal ${portalId}`
            : "Connect your HubSpot account to start syncing data"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected && (
          <div className="text-sm text-muted-foreground">
            <p>✓ Real-time contact sync enabled</p>
            <p>✓ Form submissions will be sent to HubSpot</p>
            <p>✓ Bi-directional sync active</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!isConnected ? (
          <Button onClick={onConnect} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect HubSpot
          </Button>
        ) : (
          <Button variant="outline" onClick={handleDisconnect} disabled={isLoading}>
            Disconnect
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}