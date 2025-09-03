import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, Star } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function Pricing() {
  const { t } = useTranslation();

  const plans = [
    {
      name: t('marketing.pricing.free.title'),
      price: t('marketing.pricing.free.price'),
      description: t('marketing.pricing.free.description'),
      features: t('marketing.pricing.free.features', { returnObjects: true }) as string[],
      popular: false,
      cta: 'Get Started',
    },
    {
      name: t('marketing.pricing.pro.title'),
      price: t('marketing.pricing.pro.price'),
      description: t('marketing.pricing.pro.description'),
      features: t('marketing.pricing.pro.features', { returnObjects: true }) as string[],
      popular: true,
      cta: 'Start Free Trial',
    },
    {
      name: t('marketing.pricing.enterprise.title'),
      price: t('marketing.pricing.enterprise.price'),
      description: t('marketing.pricing.enterprise.description'),
      features: t('marketing.pricing.enterprise.features', { returnObjects: true }) as string[],
      popular: false,
      cta: 'Contact Sales',
    },
  ];

  return (
    <section id="pricing" className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {t('marketing.pricing.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect plan for your business needs. Start free, upgrade when you're ready.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="inline-flex items-center px-4 py-1 rounded-full bg-primary-600 text-white text-sm font-medium">
                    <Star className="w-4 h-4 mr-1" />
                    Most Popular
                  </div>
                </div>
              )}
              
              <Card className={`p-8 h-full ${plan.popular ? 'ring-2 ring-primary-600' : ''}`}>
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                    <p className="text-gray-600 mt-2">{plan.description}</p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                      {plan.price !== '$0' && <span className="text-gray-600">/month</span>}
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? 'primary' : 'outline'}
                  >
                    {plan.cta}
                  </Button>
                  
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-gray-600">
            All plans include 14-day free trial • No credit card required • Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
}