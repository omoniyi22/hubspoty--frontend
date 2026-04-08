// frontend/src/components/FieldMappingTable.tsx

import React, { useState, useEffect } from 'react'
import { Button } from './../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './../components/ui/select'
import { Save, Loader2, Info, Mail, Phone, User } from 'lucide-react'
import { useToast } from './../hooks/use-toast'
import { FieldMapping, FieldMappingConfig, AvailableField } from './../types'

interface FieldMappingTableProps {
  instanceId: string
  initialMappings?: FieldMappingConfig
  wixFields: AvailableField[]
  hubSpotProperties: AvailableField[]
  onSave: (updates: Array<{ wixField: string; direction?: string; transform?: string | null; isActive?: boolean }>) => Promise<void>
  isLoading?: boolean
  sampleSubmission?: any // Optional sample data for preview
}

export function FieldMappingTable({ 
  instanceId, 
  initialMappings, 
  wixFields, 
  hubSpotProperties, 
  onSave,
  isLoading,
  sampleSubmission 
}: FieldMappingTableProps) {
  const { toast } = useToast()
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (initialMappings?.mappings && initialMappings.mappings.length > 0) {
      setMappings(initialMappings.mappings)
    } else {
      // Default fallback mappings with correct field paths
      setMappings([
        { 
          wixField: 'emails.items[0].email', 
          hubSpotProperty: 'email', 
          direction: 'bidirectional', 
          transform: 'email', 
          isEssential: true, 
          isActive: true,
          displayName: 'Email'
        },
        { 
          wixField: 'info.name.first', 
          hubSpotProperty: 'firstname', 
          direction: 'bidirectional', 
          transform: 'trim', 
          isEssential: true, 
          isActive: true,
          displayName: 'First Name'
        },
        { 
          wixField: 'info.name.last', 
          hubSpotProperty: 'lastname', 
          direction: 'bidirectional', 
          transform: 'trim', 
          isEssential: true, 
          isActive: true,
          displayName: 'Last Name'
        },
        { 
          wixField: 'phones.items[0].phone', 
          hubSpotProperty: 'phone', 
          direction: 'bidirectional', 
          transform: 'trim', 
          isEssential: true, 
          isActive: true,
          displayName: 'Phone'
        },
      ])
    }
  }, [initialMappings])

  // Helper function to get a readable display name for the field
  const getFieldDisplayName = (wixFieldPath: string): string => {
    const displayNames: Record<string, string> = {
      'emails.items[0].email': 'Email Address',
      'info.name.first': 'First Name',
      'info.name.last': 'Last Name',
      'phones.items[0].phone': 'Phone Number',
      'primaryInfo.email': 'Primary Email',
      'primaryInfo.phone': 'Primary Phone',
      'info.locale': 'Locale',
      'memberInfo.status': 'Member Status',
      'memberInfo.email': 'Member Email',
    }
    
    return displayNames[wixFieldPath] || wixFieldPath.split('.').pop() || wixFieldPath
  }

  // Helper function to extract sample value for preview
  const getSampleValue = (wixFieldPath: string): string => {
    if (!sampleSubmission?.formData) return ''
    
    const getValueByPath = (obj: any, path: string): any => {
      const parts = path.split('.')
      let current = obj
      
      for (const part of parts) {
        if (current === undefined || current === null) return undefined
        
        // Handle array access like items[0]
        const arrayMatch = part.match(/(\w+)\[(\d+)\]/)
        if (arrayMatch) {
          const [, arrayName, index] = arrayMatch
          current = current[arrayName]?.[parseInt(index)]
        } else {
          current = current[part]
        }
      }
      
      return current
    }
    
    const value = getValueByPath(sampleSubmission.formData, wixFieldPath)
    
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value?.email) return value.email
    if (Array.isArray(value) && value[0]?.email) return value[0].email
    
    return value ? String(value) : ''
  }

  const updateMapping = (index: number, field: keyof FieldMapping, value: string | boolean) => {
    const newMappings = [...mappings]
    newMappings[index] = { ...newMappings[index], [field]: value }
    setMappings(newMappings)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Build updates array with only the fields that can be changed
      const updates = mappings.map(m => ({
        wixField: m.wixField,
        direction: m.direction,
        transform: m.transform || null,
        isActive: m.isActive !== undefined ? m.isActive : true,
      }))
      
      // Send updates directly to parent
      await onSave(updates)
      
      toast({
        title: "Success",
        description: "Field mappings saved successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save field mappings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const directionOptions = [
    { value: 'wix_to_hubspot', label: 'Wix → HubSpot' },
    { value: 'hubspot_to_wix', label: 'HubSpot → Wix' },
    { value: 'bidirectional', label: 'Bi-directional' },
  ]

  const transformOptions = [
    { value: 'none', label: 'None' },
    { value: 'trim', label: 'Trim' },
    { value: 'lowercase', label: 'Lowercase' },
    { value: 'uppercase', label: 'Uppercase' },
    { value: 'email', label: 'Email (trim + lowercase)' },
  ]

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader className="bg-white border-b border-gray-200">
        <CardTitle className="text-xl font-semibold text-gray-900">Field Mapping</CardTitle>
        <CardDescription className="text-gray-600 mt-1">
          Configure how Wix contact fields map to HubSpot properties.
          Essential fields cannot be removed. New fields are automatically discovered from incoming webhooks.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Wix Field</th>
                {/* <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Sample Value</th> */}
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">HubSpot Property</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Sync Direction</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Transform</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 w-24">Active</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((mapping, index) => {
                const sampleValue = getSampleValue(mapping.wixField)
                
                return (
                  <tr key={`${mapping.wixField}-${index}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Field icon based on type */}
                        {mapping.wixField.includes('email') && <Mail className="h-4 w-4 text-gray-500" />}
                        {mapping.wixField.includes('phone') && <Phone className="h-4 w-4 text-gray-500" />}
                        {mapping.wixField.includes('name') && <User className="h-4 w-4 text-gray-500" />}
                        
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {getFieldDisplayName(mapping.wixField)}
                          </span>
                          <div className="text-xs text-gray-500 font-mono mt-1">
                            {mapping.wixField}
                          </div>
                        </div>
                        
                        {mapping.isEssential && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                            Essential
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* <td className="px-4 py-3">
                      {sampleValue ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 break-all max-w-xs">
                            {sampleValue}
                          </span>
                          {sampleValue.includes('@') && (
                            <Mail className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No sample data</span>
                      )}
                    </td> */}
                    
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 font-mono">{mapping.hubSpotProperty}</span>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <Select
                        value={mapping.direction}
                        onValueChange={(value: any) => updateMapping(index, 'direction', value)}
                      >
                        <SelectTrigger className="w-[160px] h-9 text-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-md">
                          {directionOptions.map(option => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value} 
                              className="text-sm bg-white hover:bg-gray-100 cursor-pointer px-3 py-2 [&_svg]:hidden"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    
                    <td className="px-4 py-3">
                      <Select
                        value={mapping.transform || 'none'}
                        onValueChange={(value) => updateMapping(index, 'transform', value === 'none' ? undefined : value as any)}
                      >
                        <SelectTrigger className="w-[140px] h-9 text-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-md">
                          {transformOptions.map(option => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value} 
                              className="text-sm bg-white hover:bg-gray-100 cursor-pointer px-3 py-2 [&_svg]:hidden"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={mapping.isActive !== false}
                            onChange={() => updateMapping(index, 'isActive', !mapping.isActive)}
                          />
                          <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                        <span className="text-xs text-gray-600">
                          {mapping.isActive !== false ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        <div className="mx-4 my-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">About Field Mapping</p>
            <p>• Essential fields (email, firstName, lastName, phone) are always present and cannot be removed.</p>
            <p>• New fields from Wix contacts are automatically discovered and added to this list.</p>
            <p>• You can only change sync direction, text transformation, and enable/disable fields.</p>
            <p>• Inactive fields will not be synced in either direction.</p>
            {sampleSubmission && (
              <p className="mt-2 text-blue-700">✓ Showing sample values from recent submission</p>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="bg-gray-50 border-t border-gray-200 px-6 py-4">
        <Button 
          onClick={handleSave} 
          disabled={isSaving || isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {(isSaving || isLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  )
}