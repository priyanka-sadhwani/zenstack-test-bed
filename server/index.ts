import express from 'express'
import cors from 'cors'
import { PrismaClient, User } from '@prisma/client'
import { enhance, type auth } from '@zenstackhq/runtime'
import { ZenStackMiddleware } from '@zenstackhq/server/express'

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

const app = express()
const port = 3001

// Create Prisma client
const prisma = new PrismaClient()

// Function to get enhanced Prisma with user context (similar to main server)
const getEnhancedPrisma = async (req: express.Request) => {
  const userId = req.headers['x-user-id'] as string
  
  if (!userId) {
    // No user - return enhanced Prisma without user context
    return enhance(prisma, { user: undefined })
  }
  
  // Fetch full user document from database (like main server does)
  const userDoc = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      labs: {
        include: {
          userLabRoles: {
            include: {
              role: {
                include: {
                  privileges: {
                    include: {
                      privilege: {
                        include: {
                          labPermissions: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      ownedLabs: true,
    },
  })
  
  if (!userDoc) {
    // User not found - return enhanced Prisma without user context
    return enhance(prisma, { user: undefined })
  }
  
  // Create context user object (like main server)
  const contextUser: auth.User = {
    id: userDoc.id,
    email: userDoc.email,
    labs: userDoc.labs || [],
    profile: userDoc.profile,
    ownedLabs: userDoc.ownedLabs,
  }
  
  return enhance(prisma, { user: contextUser })
}

// Middleware
app.use(cors())
app.use(express.json())

// ZenStack API middleware
app.use('/api', ZenStackMiddleware({ 
  getPrisma: getEnhancedPrisma
}))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ZenStack reproduction server is running' })
})

// Get owner user info for testing
app.get('/owner-user', async (req, res) => {
  try {
    const ownerUser = await prisma.user.findFirst({
      where: { email: 'owner@example.com' },
      select: { id: true, email: true, displayName: true }
    })
    
    if (!ownerUser) {
      return res.status(404).json({ error: 'Owner user not found' })
    }
    
    res.json({ success: true, user: ownerUser })
  } catch (error) {
    console.error('Error fetching owner user:', error)
    res.status(500).json({ error: 'Failed to fetch owner user' })
  }
})

// Test endpoint to verify the query works
app.get('/test-query', async (req, res) => {
  try {
    // Get enhanced Prisma with user context for this request
    const requestEnhancedPrisma = await getEnhancedPrisma(req)
    
    const result = await requestEnhancedPrisma.labProfile.findUnique({
      where: {
        slug: 'test-lab-slug',
        lab: {
          published: true,
        },
      },
      select: {
        bio: true,
        instagram: true,
        profilePhoto: { 
          select: { 
            storageRef: true 
          } 
        },
        slug: true,
        lab: {
          select: {
            id: true,
            name: true,
            content: {
              where: { 
                published: true, 
              },
              select: {
                id: true,
                name: true,
                shortDescription: true,
                longDescription: true,
                order: true,
                previewVideo: {
                  select: {
                    id: true,
                    displayName: true,
                    storageRef: true,
                    createdAt: true,
                    updatedAt: true,
                    durationMillis: true,
                  },
                },
                modules: {
                  select: {
                    id: true,
                    name: true,
                    shortDescription: true,
                    longDescription: true,
                    order: true,
                    previewVideo: {
                      select: {
                        id: true,
                        displayName: true,
                        storageRef: true,
                        createdAt: true,
                        updatedAt: true,
                        durationMillis: true,
                      },
                    },
                    classes: {
                      select: {
                        id: true,
                        name: true,
                        shortDescription: true,
                        longDescription: true,
                        order: true,
                        thumbnail: {
                          select: {
                            storageRef: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            owners: {
              select: {
                id: true,
                displayName: true,
                profile: {
                  select: {
                    bio: true,
                    profilePhoto: { 
                      select: { 
                        storageRef: true 
                      } 
                    },
                  },
                },
              },
            },
            community: {
              where: {
                userLabRoles: {
                  some: {
                    role: {
                      isTeamRole: true,
                    },
                  },
                },
              },
              select: {
                userLabRoles: {
                  where: {
                    role: {
                      isTeamRole: true,
                    },
                  },
                  select: {
                    role: {
                      select: {
                        name: true,
                        priority: true,
                      },
                    },
                  },
                },
                user: {
                  select: {
                    displayName: true,
                    profile: {
                      select: {
                        bio: true,
                        profilePhoto: { 
                          select: { 
                            storageRef: true 
                          } 
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    res.json({
      success: true,
      data: result,
      message: 'Query executed successfully'
    })
  } catch (error) {
    console.error('Query error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Query failed'
    })
  }
})

app.listen(port, () => {
  console.log(`🚀 ZenStack reproduction server running on http://localhost:${port}`)
  console.log(`📊 Health check: http://localhost:${port}/health`)
  console.log(`🧪 Test query: http://localhost:${port}/test-query`)
  console.log(`🔗 ZenStack API: http://localhost:${port}/api`)
})
