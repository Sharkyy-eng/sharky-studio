import rowdyFrontUrl from './assets/rowdy_front.png';
import rowdyWalk1Url from './assets/rowdy_walk1.png';
import rowdyWalk2Url from './assets/rowdy_walk2.png';
import catUrl    from './assets/cat.svg';
import dogUrl    from './assets/dog.svg';
import ballUrl   from './assets/ball.svg';
import starUrl   from './assets/star.svg';
import rocketUrl from './assets/rocket.svg';
import robotUrl  from './assets/robot.svg';
import birdUrl   from './assets/bird.svg';
import frogUrl   from './assets/frog.svg';
import appleUrl  from './assets/apple.svg';

// Starter sprite library. `costume` is the costume shown when the sprite is
// created; `costumes` is the full named list — cycled by "next costume" and
// selectable by "switch costume to".
export const SPRITE_LIBRARY = [
  { name: 'Roundy', costume: rowdyFrontUrl, costumes: [
      { name: 'front', url: rowdyFrontUrl },
      { name: 'walk1', url: rowdyWalk1Url },
      { name: 'walk2', url: rowdyWalk2Url },
    ], color: '#ff8c00' },
  { name: 'Cat',    costume: catUrl,    costumes: [{ name: 'cat',    url: catUrl    }], color: '#f4a261' },
  { name: 'Dog',    costume: dogUrl,    costumes: [{ name: 'dog',    url: dogUrl    }], color: '#c98a4f' },
  { name: 'Ball',   costume: ballUrl,   costumes: [{ name: 'ball',   url: ballUrl   }], color: '#ffffff' },
  { name: 'Star',   costume: starUrl,   costumes: [{ name: 'star',   url: starUrl   }], color: '#ffd43b' },
  { name: 'Rocket', costume: rocketUrl, costumes: [{ name: 'rocket', url: rocketUrl }], color: '#e63946' },
  { name: 'Robot',  costume: robotUrl,  costumes: [{ name: 'robot',  url: robotUrl  }], color: '#4ecdc4' },
  { name: 'Bird',   costume: birdUrl,   costumes: [{ name: 'bird',   url: birdUrl   }], color: '#4ea8de' },
  { name: 'Frog',   costume: frogUrl,   costumes: [{ name: 'frog',   url: frogUrl   }], color: '#76c043' },
  { name: 'Apple',  costume: appleUrl,  costumes: [{ name: 'apple',  url: appleUrl  }], color: '#e63946' },
];
