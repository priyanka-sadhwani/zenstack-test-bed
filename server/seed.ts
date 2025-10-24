import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('Seeding database...')

  // Create the owner user
  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@example.com',
      displayName: 'Owner User',
      profile: {
        create: {
          bio: 'Owner user bio',
          instagram: '@owneruser',
        }
      }
    },
    include: {
      profile: true
    }
  })

  // Create an image for profile photo
  const profileImage = await prisma.image.create({
    data: {
      storageRef: 'profile-photo-ref',
      displayName: 'Profile Photo',
      width: 200,
      height: 200,
      size: BigInt(1024)
    }
  })

  // Update owner profile with image
  await prisma.userProfile.update({
    where: { id: ownerUser.profile!.id },
    data: { profilePhotoId: profileImage.id }
  })

  // Create a lab
  const lab = await prisma.lab.create({
    data: {
      name: 'Test Lab',
      published: true,
      owners: {
        connect: { id: ownerUser.id }
      },
      profile: {
        create: {
          bio: 'Test lab bio',
          instagram: '@testlab',
          slug: 'test-lab-slug',
          profilePhotoId: profileImage.id
        }
      }
    },
    include: {
      profile: true,
      owners: true
    }
  })

  // Create admin user (team role)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      displayName: 'Admin User',
      profile: {
        create: {
          bio: 'Admin user bio',
          instagram: '@adminuser',
        }
      }
    },
    include: {
      profile: true
    }
  })

  // Create member user (non-team role)
  const memberUser = await prisma.user.create({
    data: {
      email: 'member@example.com',
      displayName: 'Member User',
      profile: {
        create: {
          bio: 'Member user bio',
          instagram: '@memberuser',
        }
      }
    },
    include: {
      profile: true
    }
  })

  // Create basic user (no role)
  const basicUser = await prisma.user.create({
    data: {
      email: 'basic@example.com',
      displayName: 'Basic User',
      profile: {
        create: {
          bio: 'Basic user bio',
          instagram: '@basicuser',
        }
      }
    },
    include: {
      profile: true
    }
  })

  // Create roles
  const adminRole = await prisma.role.create({
    data: {
      name: 'Admin',
      labId: lab.id,
      isTeamRole: true, // This is a team role
      priority: 0
    }
  })

  const memberRole = await prisma.role.create({
    data: {
      name: 'Member',
      labId: lab.id,
      isTeamRole: false, // This is NOT a team role
      priority: 2
    }
  })

  // Create user-lab joins for all non-owner users
  await prisma.userLabJoin.create({
    data: {
      userId: adminUser.id,
      labId: lab.id
    }
  })

  await prisma.userLabJoin.create({
    data: {
      userId: memberUser.id,
      labId: lab.id
    }
  })

  await prisma.userLabJoin.create({
    data: {
      userId: basicUser.id,
      labId: lab.id
    }
  })

  // Create user-lab roles for admin and member (but NOT for basic user)
  await prisma.userLabRole.create({
    data: {
      userId: adminUser.id,
      labId: lab.id,
      roleId: adminRole.id
    }
  })

  await prisma.userLabRole.create({
    data: {
      userId: memberUser.id,
      labId: lab.id,
      roleId: memberRole.id
    }
  })

  // Note: basicUser has UserLabJoin but NO UserLabRole - this tests the community query behavior

  // Create a video for preview
  const previewVideo = await prisma.video.create({
    data: {
      storageRef: 'preview-video-ref',
      displayName: 'Preview Video',
      durationMillis: 60000,
      width: 1920,
      height: 1080,
      size: BigInt(1024 * 1024)
    }
  })

  // Create content
  const content = await prisma.content.create({
    data: {
      labId: lab.id,
      name: 'Test Course',
      shortDescription: 'A test course',
      longDescription: 'This is a test course description',
      published: true,
      order: 1,
      previewVideoId: previewVideo.id
    }
  })

  // Create module
  const module = await prisma.module.create({
    data: {
      contentId: content.id,
      name: 'Test Module',
      shortDescription: 'A test module',
      longDescription: 'This is a test module description',
      published: true,
      order: 1,
      previewVideoId: previewVideo.id
    }
  })

  // Create class
  const classItem = await prisma.class.create({
    data: {
      moduleId: module.id,
      name: 'Test Class',
      shortDescription: 'A test class',
      longDescription: 'This is a test class description',
      published: true,
      order: 1,
      videoId: previewVideo.id
    }
  })

  console.log('Database seeded successfully!')
  console.log('Created:')
  console.log('- Users:', ownerUser.id, adminUser.id, memberUser.id, basicUser.id)
  console.log('- Lab:', lab.id)
  console.log('- Roles:', adminRole.id, memberRole.id)
  console.log('- Content:', content.id)
  console.log('- Module:', module.id)
  console.log('- Class:', classItem.id)
  console.log('')
  console.log('User roles:')
  console.log('- Owner User: Lab Owner (no UserLabJoin needed)')
  console.log('- Admin User: Admin role (team role)')
  console.log('- Member User: Member role (not team role)')
  console.log('- Basic User: No role (UserLabJoin only)')
}

seed()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
