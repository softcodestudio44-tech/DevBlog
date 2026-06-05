import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title = 'DevBlog — Code. Write. Share.',
  description = 'A global platform for developers to share knowledge, tutorials, and insights.',
  image = '/logo.png',
  url = 'https://devblog.com',
  type = 'website',
  keywords = 'developer blog, programming, coding, tutorials, tech',
}) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={url} />
      
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="DevBlog" />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      <meta name="robots" content="index, follow" />
    </Helmet>
  );
};

export default SEO;