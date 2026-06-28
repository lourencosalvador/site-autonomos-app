export type Service = {
  id: string;
  title: string;
  description: string;
  price: string;
  image: string;
  category: string;
};

export const SERVICES: Service[] = [
  {
    id: 'canalizacao',
    title: 'Canalização',
    description: 'Reparação de fugas, desentupimentos e instalação de sistemas de água.',
    price: '15.000 Kz',
    image: 'https://images.pexels.com/photos/8961346/pexels-photo-8961346.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Canalização',
  },
  {
    id: 'eletricidade',
    title: 'Eletricidade',
    description: 'Instalações elétricas, reparação de curtos-circuitos e manutenção.',
    price: '12.000 Kz',
    image: 'https://images.pexels.com/photos/8961066/pexels-photo-8961066.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Eletricidade',
  },
  {
    id: 'ar-condicionado',
    title: 'Ar Condicionado',
    description: 'Instalação, manutenção e reparação de sistemas de ar condicionado.',
    price: '20.000 Kz',
    image: 'https://images.pexels.com/photos/6476078/pexels-photo-6476078.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Ar Condicionado',
  },
  {
    id: 'refrigeracao',
    title: 'Refrigeração',
    description: 'Manutenção de frigoríficos e sistemas de refrigeração comercial.',
    price: '18.000 Kz',
    image: 'https://images.pexels.com/photos/8961346/pexels-photo-8961346.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Refrigeração',
  },
  {
    id: 'pintura',
    title: 'Pintura',
    description: 'Pintura interior e exterior com acabamento profissional.',
    price: '25.000 Kz',
    image: 'https://images.pexels.com/photos/462213/pexels-photo-462213.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Pintura',
  },
  {
    id: 'jardinagem',
    title: 'Jardinagem',
    description: 'Manutenção de jardins, relva e paisagismo.',
    price: '15.000 Kz',
    image: 'https://images.pexels.com/photos/1453625/pexels-photo-1453625.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Jardinagem',
  },
  {
    id: 'marcenaria',
    title: 'Marcenaria',
    description: 'Móveis sob medida e reparação de estruturas em madeira.',
    price: '18.000 Kz',
    image: 'https://images.pexels.com/photos/8961066/pexels-photo-8961066.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Marcenaria',
  },
  {
    id: 'carpintaria',
    title: 'Carpintaria',
    description: 'Construção e montagem de estruturas em madeira.',
    price: '18.000 Kz',
    image: 'https://images.pexels.com/photos/2092058/pexels-photo-2092058.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Carpintaria',
  },
  {
    id: 'serralharia',
    title: 'Serralharia',
    description: 'Trabalho em metal, portões e estruturas metálicas.',
    price: '20.000 Kz',
    image: 'https://images.pexels.com/photos/8961346/pexels-photo-8961346.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Serralharia',
  },
  {
    id: 'construcao-civil',
    title: 'Construção Civil',
    description: 'Obras, reboco, assentamento e pequenas reparações estruturais.',
    price: '30.000 Kz',
    image: 'https://images.pexels.com/photos/159306/construction-site-builders-construction-worker-159306.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Construção Civil',
  },
  {
    id: 'limpeza-residencial',
    title: 'Limpeza Residencial',
    description: 'Limpeza profunda de casas, apartamentos e escritórios.',
    price: '12.000 Kz',
    image: 'https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Limpeza',
  },
  {
    id: 'vidracaria',
    title: 'Vidraçaria',
    description: 'Instalação e substituição de vidros e janelas.',
    price: '20.000 Kz',
    image: 'https://images.pexels.com/photos/8961066/pexels-photo-8961066.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Vidraçaria',
  },
  {
    id: 'informatica',
    title: 'Informática',
    description: 'Manutenção de computadores, redes e suporte técnico.',
    price: '15.000 Kz',
    image: 'https://images.pexels.com/photos/4348404/pexels-photo-4348404.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Informática',
  },
  {
    id: 'montagem-moveis',
    title: 'Montagem de Móveis',
    description: 'Montagem e desmontagem de móveis com rapidez.',
    price: '10.000 Kz',
    image: 'https://images.pexels.com/photos/6476078/pexels-photo-6476078.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Montagem',
  },
  {
    id: 'seguranca-eletronica',
    title: 'Segurança Eletrônica',
    description: 'Câmaras, alarmes e sistemas de vigilância.',
    price: '35.000 Kz',
    image: 'https://images.pexels.com/photos/4348404/pexels-photo-4348404.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Segurança',
  },
];

export const CATEGORIES = [
  'Todos',
  'Canalização',
  'Eletricidade',
  'Ar Condicionado',
  'Refrigeração',
  'Pintura',
  'Jardinagem',
  'Marcenaria',
  'Carpintaria',
  'Serralharia',
  'Construção Civil',
  'Limpeza',
  'Vidraçaria',
  'Informática',
  'Montagem',
  'Segurança',
];

export const CITIES = [
  'Luanda',
  'Benguela',
  'Lobito',
  'Huambo',
  'Lubango',
  'Cabinda',
  'Malanje',
  'Sumbe',
  'Namibe',
  'Uíge',
];

export type Testimonial = {
  name: string;
  role: string;
  city: string;
  text: string;
  avatar: string;
  rating: number;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Ana Domingos',
    role: 'Cliente',
    city: 'Luanda',
    text: 'Pedi um canalizador e em menos de duas horas já estava em casa a resolver o problema. Profissional e educado.',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
  {
    name: 'Carlos Mendes',
    role: 'Cliente',
    city: 'Benguela',
    text: 'Achei a plataforma muito simples. Descrevi o serviço, recebi o contacto e ficou resolvido no mesmo dia.',
    avatar: 'https://images.pexels.com/photos/220457/pexels-photo-220457.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
  {
    name: 'Joana Silva',
    role: 'Prestadora',
    city: 'Luanda',
    text: 'Desde que entrei na AUTONOMOUS, recebo novos pedidos todas as semanas. Mudou a forma como trabalho.',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
  {
    name: 'Pedro Tavares',
    role: 'Cliente',
    city: 'Lobito',
    text: 'O técnico de ar condicionado foi pontual e profissional. O preço foi exatamente o combinado, sem surpresas.',
    avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
  {
    name: 'Mara Lopes',
    role: 'Prestadora',
    city: 'Huambo',
    text: 'Gosto de poder escolher quando aceitar serviços. Tenho flexibilidade e mais renda para a minha família.',
    avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
];

export const STATS = [
  { value: 100, suffix: '+', label: 'Profissionais' },
  { value: 500, suffix: '+', label: 'Clientes' },
  { value: 800, suffix: '+', label: 'Serviços realizados' },
  { value: 98, suffix: '%', label: 'Clientes satisfeitos' },
];

export const BENEFITS = [
  { title: 'Profissionais Verificados', desc: 'Cada profissional passa por um processo de validação antes de entrar na rede.' },
  { title: 'Resposta Rápida', desc: 'Receba o contacto de um profissional qualificado em poucos minutos.' },
  { title: 'Diversas Especialidades', desc: 'Mais de 15 categorias de serviços disponíveis num só lugar.' },
  { title: 'Atendimento Seguro', desc: 'Acompanhamento em todo o processo, do pedido à conclusão do serviço.' },
  { title: 'Preços Transparentes', desc: 'Saiba o valor estimado antes de avançar. Sem surpresas.' },
  { title: 'Suporte ao Cliente', desc: 'Uma equipa pronta para ajudar sempre que precisar.' },
];
