function testTopicTemplate(topic, topicTemplate) {
  // Test if topic template suits topic
  // e.g.
  // template:
  // test/{name}/topic
  // topic:
  // test/super/topic

  // find topic(s) client want to subscribe
  const topicSections = topic.split('/');
  const topicTemplateSections = topicTemplate.split('/');

  if (topicSections.length !== topicTemplateSections.length) {
    return false;
  }

  // ids of template sections(like {exchange})
  const templateSections = [];

  topicTemplateSections.forEach((section, id) => {
    if (section.startsWith('{') && section.endsWith('}')) {
      templateSections.push(id);
    }
  });

  const isTopicWrong = topicSections.some((section, id) => {
    // compare sections
    if (templateSections.indexOf(id) !== -1) {
      // template section, skip it
      return false;
    }

    if (section !== topicTemplateSections[id]) {
      return true;
    }

    return false;
  });

  return !isTopicWrong;
};

function fillTemplate(template, filling) {
  for (const [templateSection, replacement] of Object.entries(filling)) {
    template = template.replace(`{${templateSection}}`, replacement);
    // optional section
    template = template.replace(`{?${templateSection}}`, replacement);
  }

  // replace rest optional sections with none
  template = template.replace(/\/?\{\?.+?}/g, 'none');

  return template;
}

// TODO: add optional section support?
function extractFilling(topic, topicTemplate) {
  if (testTopicTemplate(topic, topicTemplate) === false) {
    return false;
  }

  const filling = {};
  const topicSections = topic.split('/');
  const topicTemplateSections = topicTemplate.split('/');

  topicTemplateSections.forEach((section, id) => {
    if (section.startsWith('{') && section.endsWith('}')) {
      const sectionName = section.slice(1, -1);
      filling[sectionName] = topicSections[id];
    }
  });

  if (Object.keys(filling).length === 0) {
    return false;
  }

  return filling;
}

module.exports = {
  testTopicTemplate,
  fillTemplate,
  extractFilling,
};
