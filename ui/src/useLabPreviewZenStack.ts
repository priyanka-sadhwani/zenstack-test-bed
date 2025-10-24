import { useFindUniqueLabProfile } from './hooks/lab-profile'

export function useLabWithContent() {
  return useFindUniqueLabProfile({
    where: {
      slug: "test-lab-slug",
      lab: {
        published: true
      }
    },
    select: {
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
              modules: {
                select: {
                  id: true,
                  name: true,
                  classes: {
                    select: {
                      id: true,
                      name: true,
                    }
                  }
                }
              }
            }
          },
        }
      }
    }
  })
}
