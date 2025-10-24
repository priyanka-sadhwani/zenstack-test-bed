import React, { useState } from 'react'
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider as ZenStackHooksProvider } from '@zenstackhq/tanstack-query/runtime-v5/react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { fetchWithAuth } from './auth/fetchWithAuth'
import { useLabWithContent } from './hooks/useLabPreviewZenStack'

const queryClient = new QueryClient()


function LabPreviewTest() {
  const [hasExecuted, setHasExecuted] = useState(false)
  const { user, login, logout, isAuthenticated } = useAuth()
  
  const zenstackQuery = useLabWithContent()
  
  const handleZenStackTest = () => {
    setHasExecuted(true)
    zenstackQuery.refetch()
  }

  const handleLogin = async () => {
    try {
      // Fetch the actual owner user from the server
      const response = await fetch('http://localhost:3001/owner-user')
      const data = await response.json()
      
      if (data.success && data.user) {
        login(data.user)
        localStorage.setItem('auth-user', JSON.stringify(data.user))
      } else {
        Alert.alert('Login Failed', 'Could not fetch owner user')
      }
    } catch (error) {
      Alert.alert('Login Failed', 'Error connecting to server')
    }
  }

  const handleLogout = () => {
    logout()
    localStorage.removeItem('auth-user')
  }

  const { data, isLoading, error } = zenstackQuery

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading ZenStack Hook test...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <TouchableOpacity style={styles.button} onPress={() => zenstackQuery.refetch()}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }


  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧪 ZenStack Hook Test</Text>
      
      {/* Authentication Section */}
      <View style={styles.authCard}>
        <Text style={styles.cardTitle}>🔐 Authentication</Text>
        {isAuthenticated ? (
          <View>
            <Text style={styles.cardText}>Logged in as: {user?.displayName}</Text>
            <Text style={styles.cardText}>Email: {user?.email}</Text>
            <TouchableOpacity style={styles.authButton} onPress={handleLogout}>
              <Text style={styles.authButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.cardText}>Not authenticated</Text>
            <TouchableOpacity style={styles.authButton} onPress={handleLogin}>
              <Text style={styles.authButtonText}>Login as Owner</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Execution Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.executeButton}
          onPress={handleZenStackTest}
        >
          <Text style={styles.executeButtonText}>
            Execute ZenStack Query
          </Text>
        </TouchableOpacity>
      </View>

      {!hasExecuted && (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>
            Click the button above to execute the ZenStack query and see results
          </Text>
        </View>
      )}

      {hasExecuted && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔍 Raw Query Response</Text>
          <ScrollView style={styles.jsonContainer}>
            <Text style={styles.jsonText}>
              {JSON.stringify(data, null, 2)}
            </Text>
          </ScrollView>
        </View>
      )}
        </ScrollView>
      )
}

// Main App component
function App() {
  return (
    <AuthProvider>
      <ZenStackHooksProvider
        value={{ endpoint: "http://localhost:3001/api", fetch: fetchWithAuth }}
      >
        <QueryClientProvider client={queryClient}>
          <View style={styles.app}>
            <LabPreviewTest />
          </View>
        </QueryClientProvider>
      </ZenStackHooksProvider>
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#333',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#e6f3ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 14,
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  itemCard: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemText: {
    fontSize: 14,
    marginBottom: 3,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
      toggleButtonTextActive: {
        color: 'white',
      },
      buttonContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 10,
      },
      executeButton: {
        flex: 1,
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
      },
      executeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
      },
      placeholderCard: {
        backgroundColor: '#f0f0f0',
        padding: 20,
        borderRadius: 8,
        marginBottom: 20,
        alignItems: 'center',
      },
      placeholderText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
      },
      authCard: {
        backgroundColor: '#fff3cd',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
      },
      authButton: {
        backgroundColor: '#28a745',
        padding: 10,
        borderRadius: 6,
        marginTop: 10,
        alignItems: 'center',
      },
      authButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
      },
      jsonContainer: {
        backgroundColor: '#f8f8f8',
        borderRadius: 4,
        padding: 10,
        maxHeight: 600,
        borderWidth: 1,
        borderColor: '#ddd',
      },
      jsonText: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#333',
        lineHeight: 16,
      },
    })

    export default App
