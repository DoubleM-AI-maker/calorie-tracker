import { db } from '@/db';
import { favorites } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';
import FavoriteItem from './FavoriteItem';
import { Star } from 'lucide-react';

export default async function FavoritesSection() {
  const userId = await getUserId();
  
  const userFavorites = await db.query.favorites.findMany({
    where: eq(favorites.userId, userId),
    orderBy: [desc(favorites.sortOrder), desc(favorites.id)],
    limit: 10
  });

  if (userFavorites.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-3xl p-8 flex flex-col items-center justify-center border border-dashed border-outline-variant/30 gap-4">
        <div className="p-3 rounded-full bg-surface-container-high">
          <Star className="w-6 h-6 text-outline" />
        </div>
        <div className="text-center">
          <h3 className="title-md text-on-surface">Noch keine Favoriten</h3>
          <p className="label-sm text-outline max-w-[200px] mt-1">
            Markiere Lebensmittel im Tagebuch mit einem Stern, um sie hier zu sehen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center px-2">
        <h2 className="title-md">Favoriten</h2>
        <span className="label-sm text-outline">{userFavorites.length} gesamt</span>
      </div>
      
      <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar -mx-2 px-2">
        {userFavorites.map((fav) => (
          <FavoriteItem key={fav.id} favorite={fav} />
        ))}
      </div>
    </div>
  );
}
