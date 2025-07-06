import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { trpc, safeTRPCQuery } from '@/lib/trpc'
import { getErrorMessage } from '@/utils/error'

// TODO: Move to shared-types when available
export type ContactType = 'supplier' | 'customer' | 'employee' | 'other'

export interface Contact {
  id: string
  name: string
  type: ContactType
  email?: string
  phone?: string
  website?: string
  address?: string
  taxNumber?: string
  companyNumber?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ContactsData {
  contacts: Contact[]
  count: number
}

export const useContactsStore = defineStore('contacts', () => {
  // State
  const contacts = ref<Contact[]>([])
  const totalCount = ref(0)
  const currentContact = ref<Contact | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)
  
  // Computed
  const hasContacts = computed(() => contacts.value.length > 0)
  
  const contactsByType = computed(() => {
    const grouped: Record<ContactType, Contact[]> = {
      supplier: [],
      customer: [],
      employee: [],
      other: []
    }
    
    contacts.value.forEach(contact => {
      if (grouped[contact.type]) {
        grouped[contact.type].push(contact)
      }
    })
    
    return grouped
  })
  
  const suppliers = computed(() => 
    contacts.value.filter(c => c.type === 'supplier')
  )
  
  const customers = computed(() => 
    contacts.value.filter(c => c.type === 'customer')
  )
  
  const employees = computed(() => 
    contacts.value.filter(c => c.type === 'employee')
  )
  
  // Actions
  async function loadContacts(force = false): Promise<void> {
    if (initialized.value && !force) {
      return
    }
    
    loading.value = true
    error.value = null
    
    try {
      const data = await safeTRPCQuery<ContactsData>(
        // TODO: Implement when API endpoint is available
        () => Promise.resolve({ contacts: [], count: 0 }),
        'Loading contacts'
      )
      
      if (data) {
        contacts.value = data.contacts
        totalCount.value = data.count
        initialized.value = true
      }
    } catch (err) {
      error.value = getErrorMessage(err)
      console.error('Failed to load contacts:', err)
    } finally {
      loading.value = false
    }
  }
  
  async function getContact(contactId: string): Promise<Contact | null> {
    // First check if we have it locally
    const localContact = contacts.value.find(c => c.id === contactId)
    if (localContact) {
      currentContact.value = localContact
      return localContact
    }
    
    // Otherwise fetch from server
    loading.value = true
    error.value = null
    
    try {
      const contact = await safeTRPCQuery<Contact>(
        // TODO: Implement when API endpoint is available
        () => Promise.resolve(null as any),
        'Loading contact'
      )
      
      if (contact) {
        currentContact.value = contact
        // Add to local cache if not exists
        const index = contacts.value.findIndex(c => c.id === contactId)
        if (index === -1) {
          contacts.value.push(contact)
        } else {
          contacts.value[index] = contact
        }
      }
      
      return contact
    } catch (err) {
      error.value = getErrorMessage(err)
      console.error('Failed to get contact:', err)
      return null
    } finally {
      loading.value = false
    }
  }
  
  async function createContact(data: {
    name: string
    type: ContactType
    email?: string
    phone?: string
    website?: string
    address?: string
    taxNumber?: string
    companyNumber?: string
    isActive?: boolean
  }): Promise<Contact | null> {
    loading.value = true
    error.value = null
    
    try {
      const contact = await safeTRPCQuery<Contact>(
        // TODO: Implement when API endpoint is available
        () => Promise.resolve(null as any),
        'Creating contact'
      )
      
      if (contact) {
        contacts.value.push(contact)
        totalCount.value += 1
      }
      
      return contact
    } catch (err) {
      error.value = getErrorMessage(err)
      console.error('Failed to create contact:', err)
      return null
    } finally {
      loading.value = false
    }
  }
  
  async function updateContact(
    contactId: string,
    updates: Partial<Contact>
  ): Promise<Contact | null> {
    loading.value = true
    error.value = null
    
    try {
      const contact = await safeTRPCQuery<Contact>(
        // TODO: Implement when API endpoint is available
        () => Promise.resolve(null as any),
        'Updating contact'
      )
      
      if (contact) {
        const index = contacts.value.findIndex(c => c.id === contactId)
        if (index !== -1) {
          contacts.value[index] = contact
        }
        if (currentContact.value?.id === contactId) {
          currentContact.value = contact
        }
      }
      
      return contact
    } catch (err) {
      error.value = getErrorMessage(err)
      console.error('Failed to update contact:', err)
      return null
    } finally {
      loading.value = false
    }
  }
  
  async function deleteContact(contactId: string): Promise<boolean> {
    loading.value = true
    error.value = null
    
    try {
      await safeTRPCQuery(
        // TODO: Implement when API endpoint is available
        () => Promise.resolve(null as any),
        'Deleting contact'
      )
      
      // Remove from local state
      contacts.value = contacts.value.filter(c => c.id !== contactId)
      totalCount.value -= 1
      
      if (currentContact.value?.id === contactId) {
        currentContact.value = null
      }
      
      return true
    } catch (err) {
      error.value = getErrorMessage(err)
      console.error('Failed to delete contact:', err)
      return false
    } finally {
      loading.value = false
    }
  }
  
  // Search/filter functions
  function searchContacts(query: string): Contact[] {
    if (!query.trim()) return contacts.value
    
    const lowerQuery = query.toLowerCase()
    return contacts.value.filter(contact => 
      contact.name.toLowerCase().includes(lowerQuery) ||
      contact.email?.toLowerCase().includes(lowerQuery) ||
      contact.phone?.toLowerCase().includes(lowerQuery) ||
      contact.taxNumber?.toLowerCase().includes(lowerQuery)
    )
  }
  
  function filterByType(type: ContactType): Contact[] {
    return contacts.value.filter(contact => contact.type === type)
  }
  
  function filterByStatus(isActive: boolean): Contact[] {
    return contacts.value.filter(contact => contact.isActive === isActive)
  }
  
  // Clear functions
  function clearError(): void {
    error.value = null
  }
  
  function clearContactData(): void {
    contacts.value = []
    totalCount.value = 0
    currentContact.value = null
    error.value = null
    initialized.value = false
  }
  
  return {
    // State
    contacts: computed(() => contacts.value),
    totalCount: computed(() => totalCount.value),
    currentContact: computed(() => currentContact.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    initialized: computed(() => initialized.value),
    
    // Computed
    hasContacts,
    contactsByType,
    suppliers,
    customers,
    employees,
    
    // Actions
    loadContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    
    // Search/filter
    searchContacts,
    filterByType,
    filterByStatus,
    
    // Utilities
    clearError,
    clearContactData
  }
})