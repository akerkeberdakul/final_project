$(function () {
  const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0ODA0MjM1MjcxOTRjYjZhZDA4ZmEyYWMxNTJlMTFkYyIsIm5iZiI6MTc5NDc2NDUwNC4yMjUsInN1YiI6IjZhZjllZWQ4NjE5MjQxY2VlNDMyYzRjOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.tgfUX12LQwLNOXpTwAg15rSJsebtfCbt05Ezh2VoybY';
  const IMG = 'https://image.tmdb.org/t/p/w500';
  const GENRES = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
  };

  const read = (key, fallback) => JSON.parse(localStorage.getItem(key)) || fallback;
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  async function tmdb(path) {
    const response = await fetch('https://api.themoviedb.org/3' + path, {
      headers: { Authorization: 'Bearer ' + TOKEN }
    });
    if (!response.ok) throw new Error('TMDB error ' + response.status);
    return response.json();
  }

  const year = (m) => (m.release_date ? m.release_date.slice(0, 4) : 'Year unknown');
  const rating = (m) => (m.vote_average ? m.vote_average.toFixed(1) : 'Not rated');
  const genresOf = (m) => (m.genre_ids || []).map((id) => GENRES[id]).filter(Boolean);
  const description = (m) => m.overview || 'No description available.';

  function poster(m, className) {
    if (!m.poster_path) return $('<div class="poster-placeholder">').text('No poster available');
    return $('<img>').addClass(className).attr({ src: IMG + m.poster_path, alt: m.title + ' poster', loading: 'lazy' });
  }

  $('#menuToggle').on('click', function () {
    const open = $('#mainNav').toggleClass('open').hasClass('open');
    $(this).attr('aria-expanded', String(open)).text(open ? '✕' : '☰');
  });

  function applyTheme(dark) {
    $('body').toggleClass('dark-theme', dark);
    $('#themeToggle').text(dark ? '☀ Light' : '☾ Dark');
  }

  applyTheme(localStorage.getItem('moviella_theme') === 'dark');

  $('#themeToggle').on('click', function () {
    const dark = !$('body').hasClass('dark-theme');
    localStorage.setItem('moviella_theme', dark ? 'dark' : 'light');
    applyTheme(dark);
  });

  function renderAuth() {
    const user = read('moviella_user', null);
    $('#userStatus').text(user ? 'Hi, ' + user.name : 'Guest');
    $('#welcomeName').text(user ? user.name : '');
    $('#name').val(user ? user.name : '');
    $('#signOutBtn, #welcomePanel, #reviewForm').toggleClass('hidden', !user);
    $('#signInPanel, #reviewNotice').toggleClass('hidden', !!user);
  }

  $('#signInForm').on('submit', function (event) {
    event.preventDefault();
    const name = $('#loginName').val().trim();
    const email = $('#loginEmail').val().trim();
    const password = $('#loginPassword').val();

    const errors = {
      loginName: name.length < 2 ? 'Enter at least 2 characters.' : '',
      loginEmail: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? '' : 'Enter a valid email address.',
      loginPassword: password.length < 8 ? 'Use at least 8 characters.' : ''
    };
    for (const id in errors) $('#' + id + 'Error').text(errors[id]);

    if (Object.values(errors).some(Boolean)) {
      $('#authMessage').text('Please correct the highlighted fields.');
      return;
    }

    write('moviella_user', { name: name, email: email });
    this.reset();
    renderAuth();
    $('#authMessage').text('You are signed in as ' + name + '.');
  });

  $('#signOutBtn').on('click', function () {
    localStorage.removeItem('moviella_user');
    renderAuth();
    $('#authMessage').text('You have signed out.');
  });

  function renderReviews() {
    $('#reviewList .user-review').remove();
    read('moviella_reviews', []).forEach(function (r) {
      $('#reviewList').append(
        $('<li class="review user-review">').append(
          $('<h3>').text(r.movie + ' ' + '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)),
          $('<p>').text(r.text),
          $('<p class="small mb-0">').text('by ' + r.author)
        )
      );
    });
  }

  $('#reviewForm').on('submit', function (event) {
    event.preventDefault();
    const user = read('moviella_user', null);
    const stars = Number($('#rating').val());
    const text = $('#text').val().trim();
    let error = '';

    if (!user) error = 'Please sign in first.';
    else if (!Number.isInteger(stars) || stars < 1 || stars > 5) error = 'Rating must be a whole number from 1 to 5.';
    else if (text.length < 10) error = 'Write at least 10 characters.';

    $('#reviewError').text(error);
    if (error) return;

    const reviews = read('moviella_reviews', []);
    reviews.push({ movie: $('#movie').val(), rating: stars, text: text, author: user.name });
    write('moviella_reviews', reviews);

    this.reset();
    renderAuth();
    renderReviews();
  });

  $('.faq-question').on('click', function () {
    const isOpen = $(this).attr('aria-expanded') === 'true';
    $(this).next('.faq-answer').stop(true, true).slideToggle(250);
    $(this).attr('aria-expanded', String(!isOpen)).find('span').text(isOpen ? '+' : '−');
  });

  let movies = [];
  let genre = 'All';

  function movieCard(m) {
    return $('<li class="movie-card">').append(
      poster(m, ''),
      $('<div class="card-body">').append(
        $('<span class="rating">').text('★ ' + rating(m)),
        $('<h3>').text(m.title),
        $('<p>').text(year(m) + ' · ' + (genresOf(m).join(', ') || 'Genre not listed')),
        $('<p>').text(description(m)),
        $('<a target="_blank" rel="noopener">').attr('href', 'https://www.themoviedb.org/movie/' + m.id).text('View details →')
      )
    );
  }

  function showMovies() {
    const shown = movies.filter((m) => genre === 'All' || genresOf(m).includes(genre));
    $('#apiResults').empty();
    shown.forEach((m) => $('#apiResults').append(movieCard(m)));
    $('#apiStatus').text(shown.length ? shown.length + ' movie(s) shown.' : 'No movies match this genre.');
  }

  async function loadMovies(path, loadingText) {
    genre = 'All';
    $('#apiStatus').text(loadingText);
    $('#apiResults, #genreFilters').empty();

    try {
      movies = (await tmdb(path)).results;
      if (!movies.length) {
        $('#apiStatus').text('No movies found. Try another title.');
        return;
      }
      ['All', ...new Set(movies.flatMap(genresOf))].forEach(function (name) {
        $('<button type="button" class="filter-btn">').text(name).toggleClass('active', name === 'All').appendTo('#genreFilters');
      });
      showMovies();
    } catch (error) {
      $('#apiStatus').text('Unable to load movies. Please check your internet connection and try again.');
      console.error(error);
    }
  }

  $('#genreFilters').on('click', '.filter-btn', function () {
    genre = $(this).text();
    $('.filter-btn').removeClass('active');
    $(this).addClass('active');
    showMovies();
  });

  if ($('#apiSearchForm').length) {
    loadMovies('/movie/popular', 'Loading popular movies...');
    $('#apiSearchForm').on('submit', function (event) {
      event.preventDefault();
      const query = $('#apiQuery').val().trim();
      if (query) loadMovies('/search/movie?include_adult=false&query=' + encodeURIComponent(query), 'Searching movies...');
    });
  }

  function trailerCard(m, trailer) {
    const $card = $('<li class="trailer-card">').append(
      poster(m, 'trailer-poster'),
      $('<h2>').text(m.title),
      $('<p>').text(year(m) + ' · ★ ' + rating(m)),
      $('<p>').text(description(m))
    );
    if (trailer) {
      $('<iframe class="trailer-video" allowfullscreen loading="lazy">')
        .attr({ src: 'https://www.youtube-nocookie.com/embed/' + trailer.key, title: m.title + ' trailer' })
        .appendTo($card);
    } else {
      $('<p class="trailer-unavailable">').text('Trailer is not available for this movie.').appendTo($card);
    }
    return $card;
  }

  async function findTrailer(movieId) {
    try {
      const data = await tmdb('/movie/' + movieId + '/videos?language=en-US');
      const videos = data.results.filter((v) => v.site === 'YouTube');
      return videos.find((v) => v.type === 'Trailer' && v.official)
        || videos.find((v) => v.type === 'Trailer')
        || videos.find((v) => v.type === 'Teaser');
    } catch (error) {
      return null;
    }
  }

  async function loadTrailers(path, loadingText) {
    $('#trailerStatus').text(loadingText);
    $('#trailerResults').empty();

    try {
      const list = (await tmdb(path)).results.slice(0, 8);
      if (!list.length) {
        $('#trailerStatus').text('No movies found. Try another title.');
        return;
      }
      const trailers = await Promise.all(list.map((m) => findTrailer(m.id)));
      list.forEach((m, i) => $('#trailerResults').append(trailerCard(m, trailers[i])));
      $('#trailerStatus').text('Showing ' + list.length + ' movie(s).');
    } catch (error) {
      $('#trailerStatus').text('Unable to load trailers. Please check your internet connection and try again.');
      console.error(error);
    }
  }

  if ($('#trailerSearchForm').length) {
    loadTrailers('/movie/popular', 'Loading popular trailers...');
    $('#trailerSearchForm').on('submit', function (event) {
      event.preventDefault();
      const query = $('#trailerQuery').val().trim();
      if (query) loadTrailers('/search/movie?query=' + encodeURIComponent(query), 'Searching for movies and trailers...');
    });
  }

  renderAuth();
  renderReviews();
});
